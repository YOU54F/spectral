import {
  DiagnosticSeverity,
  GetLocationForJsonPath,
  IDiagnostic,
  IParserResult,
  IRange,
  JsonPath,
} from '@stoplight/types';
import { IParser } from './types';

// A small hand-written, non-validating XML 1.0 parser with namespace support.
// It produces a plain JSON-friendly tree that is not tied to any XML vocabulary (WSDL, XSD, ...)
// and keeps a range for every element, attribute and attribute value, so that Spectral can report precise locations.
// Well-formedness errors become diagnostics instead of exceptions, and the parser recovers where it is cheap to do so.
//
// Supported: the XML declaration, elements, attributes, namespaces, text, CDATA sections, comments,
// processing instructions, the predefined entities and numeric character references.
// A DOCTYPE is skipped: the DTD is not parsed, so entities declared in it are not expanded.
// Comments and processing instructions are not part of the tree.

export type XmlAttribute = {
  value: string;
  // null when the attribute name has no prefix
  prefix: string | null;
  localName: string;
  // null for unprefixed attributes, which are in no namespace
  namespace: string | null;
};

export type XmlElement = {
  // the qualified name as written, e.g. "wsdl:definitions"
  name: string;
  // null when the element name has no prefix
  prefix: string | null;
  localName: string;
  // null when the element is in no namespace
  namespace: string | null;
  // keyed by the qualified name as written, e.g. "name" or "xml:lang"; xmlns declarations are not included
  attributes: Record<string, XmlAttribute>;
  // the namespace declarations in scope for this element (inherited ones included), prefix -> URI;
  // the default namespace uses the '' key. Use it to resolve QName attribute values such as type="tns:Foo".
  namespaces: Record<string, string>;
  // child elements, in document order
  children: XmlElement[];
  // the concatenated character data (text and CDATA) directly inside the element; omitted when it is only whitespace
  text?: string;
};

export type XmlDocument = {
  kind: 'xml';
  // from the XML declaration, when present
  version?: string;
  encoding?: string;
  standalone?: boolean;
  // the root element name of the DOCTYPE, when present
  doctype?: string;
  // null when the document has no root element
  root: XmlElement | null;
};

// ast maps a JSON path (joined with \u0000) to its range
export type XmlParserResult = IParserResult<XmlDocument, Map<string, IRange>, number[]>;

export const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';
export const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

const NAME = /[A-Za-z_:\u00C0-\uFFFF][-.\w:\u00B7\u00C0-\uFFFF]*/y;
const WHITESPACE = /[ \t\r\n]/;
const PREDEFINED_ENTITIES: Record<string, string> = { lt: '<', gt: '>', amp: '&', apos: "'", quot: '"' };

const pathKey = (path: JsonPath): string => path.map(String).join('\u0000');

function isXmlChar(code: number): boolean {
  return (
    code === 0x9 ||
    code === 0xa ||
    code === 0xd ||
    (code >= 0x20 && code <= 0xd7ff) ||
    (code >= 0xe000 && code <= 0xfffd) ||
    (code >= 0x10000 && code <= 0x10ffff)
  );
}

type RawAttribute = {
  qname: string;
  value: string;
  nameStart: number;
  nameEnd: number;
  valueStart: number;
  valueEnd: number;
  end: number;
};

type Frame = {
  element: XmlElement;
  // null for elements that are not part of the tree, e.g. a second root element
  path: JsonPath | null;
  nameStart: number;
  nameEnd: number;
  contentStart: number;
  text: string[];
  textStart: number;
  textEnd: number;
};

class XmlParser {
  readonly ast = new Map<string, IRange>();
  readonly diagnostics: IDiagnostic[] = [];
  readonly lineMap: number[] = [0];
  readonly data: XmlDocument = { kind: 'xml', root: null };

  #pos = 0;
  readonly #stack: Frame[] = [];

  constructor(private readonly input: string) {
    for (let i = 0; i < input.length; i++) {
      if (input.charCodeAt(i) === 10) this.lineMap.push(i + 1);
    }
  }

  position(offset: number): IRange['start'] {
    const { lineMap } = this;
    let low = 0;
    let high = lineMap.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (lineMap[mid] <= offset) low = mid;
      else high = mid - 1;
    }

    return { line: low, character: offset - lineMap[low] };
  }

  range(start: number, end: number): IRange {
    return { start: this.position(start), end: this.position(end) };
  }

  error(message: string, start: number, end: number, severity = DiagnosticSeverity.Error): void {
    this.diagnostics.push({ code: 'parser', message, range: this.range(start, end), severity });
  }

  set(path: JsonPath | null, start: number, end: number): void {
    if (path !== null) this.ast.set(pathKey(path), this.range(start, end));
  }

  parse(): void {
    const { input } = this;
    if (input.charCodeAt(0) === 0xfeff) this.#pos = 1;

    while (this.#pos < input.length) {
      const lt = input.indexOf('<', this.#pos);
      const end = lt === -1 ? input.length : lt;
      if (end > this.#pos) this.text(this.#pos, end, false);
      if (lt === -1) break;
      this.#pos = lt;

      if (input.startsWith('<!--', lt)) this.comment();
      else if (input.startsWith('<![CDATA[', lt)) this.cdata();
      else if (input.startsWith('<!DOCTYPE', lt)) this.doctype();
      else if (input.startsWith('<?', lt)) this.processingInstruction();
      else if (input.startsWith('</', lt)) this.endTag();
      else if (input.startsWith('<!', lt)) {
        const close = input.indexOf('>', lt);
        const stop = close === -1 ? input.length : close + 1;
        this.error('Unexpected markup declaration', lt, stop);
        this.#pos = stop;
      } else this.startTag();
    }

    for (let i = this.#stack.length - 1; i >= 0; i--) {
      const frame = this.#stack[i];
      this.error(`Element <${frame.element.name}> is not closed`, frame.nameStart - 1, frame.nameEnd);
      this.finish(frame, input.length);
    }

    this.#stack.length = 0;

    if (this.data.root === null) {
      this.error('Document has no root element', input.length, input.length);
    }

    this.set([], 0, input.length);
  }

  readName(offset: number): string {
    NAME.lastIndex = offset;
    const match = NAME.exec(this.input);
    return match === null ? '' : match[0];
  }

  skipWhitespace(): void {
    while (this.#pos < this.input.length && WHITESPACE.test(this.input[this.#pos])) this.#pos++;
  }

  // Decodes entity and character references, normalizes line endings
  // and, for attribute values, turns literal whitespace into spaces.
  decode(start: number, end: number, attribute: boolean): string {
    const { input } = this;
    let out = '';
    let i = start;
    while (i < end) {
      const ch = input[i];
      if (ch === '&') {
        const semicolon = input.indexOf(';', i);
        const name = semicolon === -1 || semicolon >= end || semicolon - i > 40 ? null : input.slice(i + 1, semicolon);
        if (name === null || name.length === 0) {
          this.error('Unescaped "&", use "&amp;" instead', i, i + 1);
          out += '&';
          i++;
          continue;
        }

        const decoded = this.reference(name, i, semicolon + 1);
        out += decoded ?? input.slice(i, semicolon + 1);
        i = semicolon + 1;
      } else if (ch === '\r') {
        out += attribute ? ' ' : '\n';
        i += input[i + 1] === '\n' ? 2 : 1;
      } else if (attribute && (ch === '\n' || ch === '\t')) {
        out += ' ';
        i++;
      } else {
        out += ch;
        i++;
      }
    }

    return out;
  }

  reference(name: string, start: number, end: number): string | null {
    if (name.startsWith('#')) {
      const hex = name[1] === 'x';
      const digits = name.slice(hex ? 2 : 1);
      const code = (hex ? /^[0-9A-Fa-f]+$/ : /^[0-9]+$/).test(digits) ? parseInt(digits, hex ? 16 : 10) : NaN;
      if (Number.isNaN(code) || !isXmlChar(code)) {
        this.error(`Invalid character reference "&${name};"`, start, end);
        return null;
      }

      return String.fromCodePoint(code);
    }

    if (name in PREDEFINED_ENTITIES) return PREDEFINED_ENTITIES[name];

    if (this.readName(start + 1) !== name) {
      this.error(`Invalid entity reference "&${name};"`, start, end);
    } else if (this.data.doctype !== void 0) {
      this.error(
        `Entity "&${name};" is not expanded because DTDs are not parsed`,
        start,
        end,
        DiagnosticSeverity.Warning,
      );
    } else {
      this.error(`Undefined entity "&${name};"`, start, end);
    }

    return null;
  }

  text(start: number, end: number, cdata: boolean): void {
    const frame = this.#stack[this.#stack.length - 1];
    const raw = this.input.slice(start, end);
    if (frame === void 0) {
      if (/\S/.test(raw)) {
        this.error(`${cdata ? 'CDATA' : 'Text'} is not allowed outside the root element`, start, end);
      }

      return;
    }

    const value = cdata ? raw.replace(/\r\n?/g, '\n') : this.decode(start, end, false);
    frame.text.push(value);
    if (/\S/.test(value)) {
      if (frame.textStart === -1) frame.textStart = start;
      frame.textEnd = end;
    }
  }

  comment(): void {
    const start = this.#pos;
    const end = this.input.indexOf('-->', start + 4);
    if (end === -1) {
      this.error('Comment is not closed', start, start + 4);
      this.#pos = this.input.length;
    } else {
      this.#pos = end + 3;
    }
  }

  cdata(): void {
    const start = this.#pos;
    const end = this.input.indexOf(']]>', start + 9);
    if (end === -1) {
      this.error('CDATA section is not closed', start, start + 9);
      this.text(start + 9, this.input.length, true);
      this.#pos = this.input.length;
    } else {
      this.text(start + 9, end, true);
      this.#pos = end + 3;
    }
  }

  doctype(): void {
    const { input } = this;
    const start = this.#pos;
    if (this.data.root !== null || this.#stack.length > 0) {
      this.error('DOCTYPE must come before the root element', start, start + 9);
    }

    this.#pos += 9;
    this.skipWhitespace();
    const name = this.readName(this.#pos);
    if (name.length > 0) this.data.doctype = name;

    // skip the rest, including an internal subset, minding quoted strings
    let depth = 0;
    let quote: string | null = null;
    for (let i = this.#pos; i < input.length; i++) {
      const ch = input[i];
      if (quote !== null) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '[') depth++;
      else if (ch === ']') depth--;
      else if (ch === '>' && depth <= 0) {
        this.#pos = i + 1;
        return;
      }
    }

    this.error('DOCTYPE is not closed', start, start + 9);
    this.#pos = input.length;
  }

  processingInstruction(): void {
    const { input } = this;
    const start = this.#pos;
    const target = this.readName(start + 2);
    const close = input.indexOf('?>', start + 2);
    const end = close === -1 ? input.length : close + 2;
    this.#pos = end;

    if (close === -1) {
      this.error('Processing instruction is not closed', start, start + 2 + target.length);
      return;
    }

    if (target.length === 0) {
      this.error('Processing instruction has no target', start, end);
    } else if (target === 'xml') {
      if (start !== (input.charCodeAt(0) === 0xfeff ? 1 : 0)) {
        this.error('The XML declaration is only allowed at the start of the document', start, end);
        return;
      }

      const body = input.slice(start + 5, close);
      const pseudo = (name: string): string | undefined =>
        new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`)
          .exec(body)
          ?.slice(1)
          .find(v => v !== void 0);
      const version = pseudo('version');
      const encoding = pseudo('encoding');
      const standalone = pseudo('standalone');
      if (version === void 0) this.error('The XML declaration must have a version', start, end);
      else this.data.version = version;
      if (encoding !== void 0) this.data.encoding = encoding;
      if (standalone !== void 0) this.data.standalone = standalone === 'yes';
    } else if (target.toLowerCase() === 'xml') {
      this.error(`Processing instruction target "${target}" is reserved`, start, start + 2 + target.length);
    }
  }

  // Splits a QName and resolves its prefix. Reports invalid names and unbound prefixes.
  resolve(
    qname: string,
    scope: Record<string, string>,
    useDefault: boolean,
    start: number,
  ): { prefix: string | null; localName: string; namespace: string | null } {
    const colon = qname.indexOf(':');
    if (colon === -1) {
      return { prefix: null, localName: qname, namespace: useDefault ? (scope[''] ?? null) : null };
    }

    const prefix = qname.slice(0, colon);
    const localName = qname.slice(colon + 1);
    if (prefix.length === 0 || localName.length === 0 || localName.includes(':')) {
      this.error(`Invalid qualified name "${qname}"`, start, start + qname.length);
      return { prefix: null, localName: qname, namespace: useDefault ? (scope[''] ?? null) : null };
    }

    const namespace = prefix === 'xml' ? XML_NAMESPACE : scope[prefix];
    if (namespace === void 0) {
      this.error(`Namespace prefix "${prefix}" is not bound`, start, start + prefix.length);
    }

    return { prefix, localName, namespace: namespace ?? null };
  }

  attributes(): { list: RawAttribute[]; selfClosing: boolean; closed: boolean } {
    const { input } = this;
    const list: RawAttribute[] = [];

    for (;;) {
      const before = this.#pos;
      this.skipWhitespace();
      if (this.#pos >= input.length) return { list, selfClosing: false, closed: false };
      if (input.startsWith('/>', this.#pos)) {
        this.#pos += 2;
        return { list, selfClosing: true, closed: true };
      }

      if (input[this.#pos] === '>') {
        this.#pos++;
        return { list, selfClosing: false, closed: true };
      }

      if (input[this.#pos] === '<') return { list, selfClosing: false, closed: false };

      const nameStart = this.#pos;
      const qname = this.readName(nameStart);
      if (qname.length === 0) {
        this.error(`Unexpected character "${input[nameStart]}" in tag`, nameStart, nameStart + 1);
        this.#pos++;
        continue;
      }

      if (before === nameStart && list.length > 0) {
        this.error('Attributes must be separated by whitespace', nameStart, nameStart + qname.length);
      }

      this.#pos += qname.length;
      const nameEnd = this.#pos;
      this.skipWhitespace();
      if (input[this.#pos] !== '=') {
        this.error(`Attribute "${qname}" has no value`, nameStart, nameEnd);
        continue;
      }

      this.#pos++;
      this.skipWhitespace();
      const quote = input[this.#pos];
      if (quote !== '"' && quote !== "'") {
        // recover by reading an unquoted value
        const valueStart = this.#pos;
        while (this.#pos < input.length && !/[\s>]/.test(input[this.#pos]) && !input.startsWith('/>', this.#pos)) {
          this.#pos++;
        }

        this.error(`Value of attribute "${qname}" must be quoted`, valueStart, this.#pos);
        list.push({
          qname,
          value: this.decode(valueStart, this.#pos, true),
          nameStart,
          nameEnd,
          valueStart,
          valueEnd: this.#pos,
          end: this.#pos,
        });
        continue;
      }

      const valueStart = this.#pos + 1;
      const valueEnd = input.indexOf(quote, valueStart);
      if (valueEnd === -1) {
        this.error(`Value of attribute "${qname}" is not closed`, nameStart, valueStart);
        this.#pos = input.length;
        return { list, selfClosing: false, closed: false };
      }

      const lt = input.indexOf('<', valueStart);
      if (lt !== -1 && lt < valueEnd) {
        this.error('"<" is not allowed in attribute values, use "&lt;" instead', lt, lt + 1);
      }

      list.push({
        qname,
        value: this.decode(valueStart, valueEnd, true),
        nameStart,
        nameEnd,
        valueStart,
        valueEnd,
        end: valueEnd + 1,
      });
      this.#pos = valueEnd + 1;
    }
  }

  startTag(): void {
    const start = this.#pos;
    const name = this.readName(start + 1);
    if (name.length === 0) {
      this.error('Unescaped "<", use "&lt;" instead', start, start + 1);
      this.#pos++;
      this.text(start, start + 1, true);
      return;
    }

    const nameStart = start + 1;
    const nameEnd = nameStart + name.length;
    this.#pos = nameEnd;
    const { list, selfClosing, closed } = this.attributes();
    if (!closed) this.error(`Start tag <${name}> is not closed`, start, nameEnd);
    const tagEnd = this.#pos;

    const parent = this.#stack[this.#stack.length - 1];
    const parentScope = parent?.element.namespaces ?? {};
    const scope: Record<string, string> = { ...parentScope };
    const seen = new Set<string>();
    const regular: RawAttribute[] = [];

    for (const attribute of list) {
      if (seen.has(attribute.qname)) {
        this.error(`Duplicate attribute "${attribute.qname}"`, attribute.nameStart, attribute.nameEnd);
        continue;
      }

      seen.add(attribute.qname);
      if (attribute.qname === 'xmlns') {
        if (attribute.value === XML_NAMESPACE || attribute.value === XMLNS_NAMESPACE) {
          this.error(`"${attribute.value}" cannot be the default namespace`, attribute.valueStart, attribute.valueEnd);
        } else if (attribute.value.length === 0) {
          delete scope[''];
        } else {
          scope[''] = attribute.value;
        }
      } else if (attribute.qname.startsWith('xmlns:')) {
        const prefix = attribute.qname.slice(6);
        if (attribute.value.length === 0) {
          this.error(`Namespace prefix "${prefix}" cannot be undeclared`, attribute.nameStart, attribute.end);
        } else if (prefix === 'xmlns' || (prefix === 'xml') !== (attribute.value === XML_NAMESPACE)) {
          this.error(
            `Namespace prefix "${prefix}" cannot be bound to "${attribute.value}"`,
            attribute.nameStart,
            attribute.end,
          );
        } else if (attribute.value === XMLNS_NAMESPACE) {
          this.error(
            `Namespace "${attribute.value}" cannot be bound to a prefix`,
            attribute.valueStart,
            attribute.valueEnd,
          );
        } else if (prefix !== 'xml') {
          scope[prefix] = attribute.value;
        }
      } else {
        regular.push(attribute);
      }
    }

    const element: XmlElement = {
      name,
      ...this.resolve(name, scope, true, nameStart),
      attributes: {},
      namespaces: scope,
      children: [],
    };

    let path: JsonPath | null;
    if (parent !== void 0) {
      path = parent.path === null ? null : [...parent.path, 'children', parent.element.children.length];
      parent.element.children.push(element);
    } else if (this.data.root === null) {
      path = ['root'];
      this.data.root = element;
    } else {
      this.error('Only one root element is allowed', start, nameEnd);
      path = null;
    }

    this.set(path, start, tagEnd);
    for (const key of ['name', 'prefix', 'localName', 'namespace']) {
      this.set(path && [...path, key], nameStart, nameEnd);
    }

    const expanded = new Set<string>();
    for (const attribute of regular) {
      const resolved = this.resolve(attribute.qname, scope, false, attribute.nameStart);
      const key = `{${resolved.namespace ?? ''}}${resolved.localName}`;
      if (resolved.namespace !== null && expanded.has(key)) {
        this.error(`Duplicate attribute "${key}"`, attribute.nameStart, attribute.nameEnd);
        continue;
      }

      expanded.add(key);
      element.attributes[attribute.qname] = { value: attribute.value, ...resolved };
      const attributePath = path && [...path, 'attributes', attribute.qname];
      this.set(attributePath, attribute.nameStart, attribute.end);
      this.set(attributePath && [...attributePath, 'value'], attribute.valueStart, attribute.valueEnd);
      for (const key of ['prefix', 'localName', 'namespace']) {
        this.set(attributePath && [...attributePath, key], attribute.nameStart, attribute.nameEnd);
      }
    }

    for (const attribute of list) {
      if (attribute.qname === 'xmlns' || attribute.qname.startsWith('xmlns:')) {
        this.set(path && [...path, 'namespaces', attribute.qname.slice(6)], attribute.nameStart, attribute.end);
      }
    }

    const frame: Frame = {
      element,
      path,
      nameStart,
      nameEnd,
      contentStart: tagEnd,
      text: [],
      textStart: -1,
      textEnd: -1,
    };
    if (selfClosing || !closed) {
      this.finish(frame, tagEnd);
    } else {
      this.#stack.push(frame);
    }
  }

  endTag(): void {
    const { input } = this;
    const start = this.#pos;
    const name = this.readName(start + 2);
    this.#pos = start + 2 + name.length;
    this.skipWhitespace();
    if (input[this.#pos] === '>') {
      this.#pos++;
    } else {
      this.error(`Closing tag </${name}> is not closed`, start, start + 2 + name.length);
    }

    const end = this.#pos;
    const index = this.#stack.map(frame => frame.element.name).lastIndexOf(name);
    if (index === -1) {
      const top = this.#stack[this.#stack.length - 1];
      this.error(
        top === void 0
          ? `Unexpected closing tag </${name}>`
          : `Closing tag </${name}> does not match <${top.element.name}>`,
        start,
        end,
      );
      return;
    }

    const unclosed = this.#stack.splice(index).reverse();
    for (const frame of unclosed.slice(0, -1)) {
      this.error(`Element <${frame.element.name}> is not closed`, frame.nameStart - 1, frame.nameEnd);
      this.finish(frame, start);
    }

    this.finish(unclosed[unclosed.length - 1], start);
  }

  finish(frame: Frame, contentEnd: number): void {
    const text = frame.text.join('');
    if (/\S/.test(text)) {
      frame.element.text = text;
      this.set(frame.path && [...frame.path, 'text'], frame.textStart, frame.textEnd);
    }

    if (contentEnd > frame.contentStart) {
      this.set(frame.path && [...frame.path, 'children'], frame.contentStart, contentEnd);
    }
  }
}

export const parseXml = (input: string): XmlParserResult => {
  const parser = new XmlParser(input);
  parser.parse();
  return { data: parser.data, ast: parser.ast, lineMap: parser.lineMap, diagnostics: parser.diagnostics };
};

export const getLocationForJsonPathInXml: GetLocationForJsonPath<XmlParserResult> = (result, path, closest = false) => {
  for (let length = path.length; length >= 0; length--) {
    const range = result.ast.get(pathKey(path.slice(0, length)));
    if (range !== void 0) return { range };
    if (!closest) return;
  }

  return;
};

export const Xml: IParser<XmlParserResult> = {
  parse: parseXml,
  getLocationForJsonPath: getLocationForJsonPathInXml,
  trapAccess: obj => obj,
};

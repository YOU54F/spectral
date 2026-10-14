import {
  DiagnosticSeverity,
  GetLocationForJsonPath,
  IDiagnostic,
  IParserResult,
  IRange,
  JsonPath,
} from '@stoplight/types';
import { IParser } from './types';

// A small hand-written tokenizer and recursive-descent parser for Protocol Buffers (proto2, proto3 and editions).
// It produces a plain JSON-friendly tree and keeps a range for every node and every scalar property,
// so that Spectral can report precise locations. Syntax errors become diagnostics instead of exceptions.

export type ProtobufOptionValue = string | number | boolean;
export type ProtobufOptions = Record<string, ProtobufOptionValue>;

export type ProtobufReserved = {
  ranges: { start: number; end: number | 'max' }[];
  names: string[];
};

export type ProtobufField = {
  name: string;
  type: string;
  number: number;
  label?: 'optional' | 'required' | 'repeated';
  keyType?: string;
  valueType?: string;
  options: ProtobufOptions;
  comment?: string;
};

export type ProtobufOneof = {
  name: string;
  fields: ProtobufField[];
  options: ProtobufOptions;
  comment?: string;
};

export type ProtobufEnumValue = {
  name: string;
  number: number;
  options: ProtobufOptions;
  comment?: string;
};

export type ProtobufEnum = {
  name: string;
  values: ProtobufEnumValue[];
  options: ProtobufOptions;
  reserved: ProtobufReserved;
  comment?: string;
};

export type ProtobufExtend = {
  extendee: string;
  fields: ProtobufField[];
  comment?: string;
};

export type ProtobufMessage = {
  name: string;
  fields: ProtobufField[];
  oneofs: ProtobufOneof[];
  messages: ProtobufMessage[];
  enums: ProtobufEnum[];
  extends: ProtobufExtend[];
  reserved: ProtobufReserved;
  extensions: ProtobufReserved['ranges'];
  options: ProtobufOptions;
  comment?: string;
};

export type ProtobufRpc = {
  name: string;
  requestType: string;
  requestStream: boolean;
  responseType: string;
  responseStream: boolean;
  options: ProtobufOptions;
  comment?: string;
};

export type ProtobufService = {
  name: string;
  rpcs: ProtobufRpc[];
  options: ProtobufOptions;
  comment?: string;
};

export type ProtobufDocument = {
  // Usually 'proto2' | 'proto3' | 'editions'; unknown syntax values are kept as written.
  // 'proto2' when the file has neither a syntax nor an edition declaration, 'editions' when it has an edition.
  syntax: string;
  edition?: string;
  package: string | null;
  imports: { path: string; modifier?: 'public' | 'weak' }[];
  options: ProtobufOptions;
  messages: ProtobufMessage[];
  enums: ProtobufEnum[];
  services: ProtobufService[];
  extends: ProtobufExtend[];
};

// ast maps a JSON path (joined with \u0000) to its range
export type ProtobufParserResult = IParserResult<ProtobufDocument, Map<string, IRange>, number[]>;

type TokenType = 'ident' | 'number' | 'string' | 'symbol' | 'eof';

type Token = {
  type: TokenType;
  value: string;
  range: IRange;
  comment?: string;
};

type Comment = { text: string; startLine: number; endLine: number };

const ID_START = /[A-Za-z_]/;
const ID_PART = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;
const NUMBER_PART = /[0-9A-Za-z_.]/;

function cleanComment(raw: string, block: boolean): string {
  if (!block) return raw.replace(/^\/\/\/?\s?/, '');
  return raw
    .replace(/^\/\*\*?/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map(line => line.replace(/^\s*\*(?!\/)\s?/, '').trimEnd())
    .join('\n')
    .trim();
}

function tokenize(input: string, diagnostics: IDiagnostic[]): { tokens: Token[]; lineMap: number[] } {
  const tokens: Token[] = [];
  const lineMap: number[] = [0];
  let pos = 0;
  let line = 0;
  let lineStart = 0;
  let pending: Comment[] = [];
  let lastTokenLine = -1;

  const advance = (): string => {
    const ch = input[pos++];
    if (ch === '\n') {
      line++;
      lineStart = pos;
      lineMap.push(pos);
    }

    return ch;
  };

  const position = (): { line: number; character: number } => ({ line, character: pos - lineStart });

  const leadingComment = (tokenLine: number): string | undefined => {
    // Comments directly above the token (no blank line in between) that do not trail the previous token.
    const parts: string[] = [];
    let expected = tokenLine;
    for (let i = pending.length - 1; i >= 0; i--) {
      const c = pending[i];
      if (c.startLine === lastTokenLine || c.endLine < expected - 1) break;
      parts.unshift(c.text);
      expected = c.startLine;
    }

    pending = [];
    return parts.length > 0 ? parts.join('\n') : void 0;
  };

  while (pos < input.length) {
    const ch = input[pos];
    if (/\s/.test(ch)) {
      advance();
      continue;
    }

    const start = position();

    if (ch === '/' && input[pos + 1] === '/') {
      const begin = pos;
      while (pos < input.length && input[pos] !== '\n') advance();
      pending.push({
        text: cleanComment(input.slice(begin, pos).trimEnd(), false),
        startLine: start.line,
        endLine: line,
      });
      continue;
    }

    if (ch === '/' && input[pos + 1] === '*') {
      const begin = pos;
      advance();
      advance();
      while (pos < input.length && !(input[pos] === '*' && input[pos + 1] === '/')) advance();
      if (pos >= input.length) {
        diagnostics.push(error('Unterminated block comment', { start, end: position() }));
      } else {
        advance();
        advance();
      }

      pending.push({ text: cleanComment(input.slice(begin, pos), true), startLine: start.line, endLine: line });
      continue;
    }

    let type: TokenType;
    let value: string;

    if (ID_START.test(ch)) {
      const begin = pos;
      while (pos < input.length && ID_PART.test(input[pos])) advance();
      type = 'ident';
      value = input.slice(begin, pos);
    } else if (DIGIT.test(ch) || (ch === '.' && DIGIT.test(input[pos + 1] ?? ''))) {
      const begin = pos;
      while (
        pos < input.length &&
        (NUMBER_PART.test(input[pos]) ||
          ((input[pos] === '-' || input[pos] === '+') &&
            /[eE]/.test(input[pos - 1]) &&
            !/^0[xX]/.test(input.slice(begin))))
      ) {
        advance();
      }

      type = 'number';
      value = input.slice(begin, pos);
    } else if (ch === '"' || ch === "'") {
      advance();
      let str = '';
      let terminated = false;
      while (pos < input.length && input[pos] !== '\n') {
        const c = advance();
        if (c === ch) {
          terminated = true;
          break;
        }

        if (c === '\\' && pos < input.length) {
          const e = advance();
          str += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : e === '0' ? '\0' : e;
        } else {
          str += c;
        }
      }

      if (!terminated) {
        diagnostics.push(error('Unterminated string literal', { start, end: position() }));
      }

      type = 'string';
      value = str;
    } else {
      advance();
      type = 'symbol';
      value = ch;
    }

    const token: Token = { type, value, range: { start, end: position() } };
    const comment = leadingComment(start.line);
    if (comment !== void 0) token.comment = comment;
    tokens.push(token);
    lastTokenLine = line;
  }

  const end = position();
  tokens.push({ type: 'eof', value: '', range: { start: end, end } });
  return { tokens, lineMap };
}

function error(message: string, range: IRange): IDiagnostic {
  return { code: 'parser', message, range, severity: DiagnosticSeverity.Error };
}

class ProtobufSyntaxError extends Error {
  constructor(
    message: string,
    public readonly range: IRange,
  ) {
    super(message);
  }
}

const describeToken = (token: Token): string =>
  token.type === 'eof'
    ? 'end of file'
    : token.type === 'symbol'
      ? `"${token.value}"`
      : token.type === 'ident'
        ? 'identifier'
        : token.type === 'number'
          ? 'number'
          : 'string';

const LABELS = new Set(['optional', 'required', 'repeated']);

const emptyReserved = (): ProtobufReserved => ({ ranges: [], names: [] });

class Parser {
  private pos = 0;
  readonly ast = new Map<string, IRange>();

  constructor(
    private readonly tokens: Token[],
    private readonly diagnostics: IDiagnostic[],
  ) {}

  // -- token helpers

  private get peek(): Token {
    return this.tokens[this.pos];
  }

  private lookahead(n: number): Token {
    return this.tokens[Math.min(this.pos + n, this.tokens.length - 1)];
  }

  private next(): Token {
    const token = this.tokens[this.pos];
    if (token.type !== 'eof') this.pos++;
    return token;
  }

  private is(value: string, token = this.peek): boolean {
    return (token.type === 'symbol' || token.type === 'ident') && token.value === value;
  }

  private fail(expected: string, token = this.peek): never {
    throw new ProtobufSyntaxError(`Expected ${expected} but found ${describeToken(token)}`, token.range);
  }

  private expect(value: string): Token {
    if (!this.is(value)) this.fail(`"${value}"`);
    return this.next();
  }

  private ident(): Token {
    if (this.peek.type !== 'ident') this.fail('identifier');
    return this.next();
  }

  // full identifier, e.g. foo.bar.Baz or .foo.Bar
  private fullIdent(allowLeadingDot = false): { value: string; first: Token; last: Token } {
    const first = this.peek;
    let value = '';
    if (allowLeadingDot && this.is('.')) {
      this.next();
      value = '.';
    }

    let last = this.ident();
    value += last.value;
    while (this.is('.')) {
      this.next();
      last = this.ident();
      value += `.${last.value}`;
    }

    return { value, first, last };
  }

  private string(): { value: string; first: Token; last: Token } {
    if (this.peek.type !== 'string') this.fail('string');
    const first = this.next();
    let last = first;
    let value = first.value;
    while (this.peek.type === 'string') {
      last = this.next();
      value += last.value;
    }

    return { value, first, last };
  }

  private int(): { value: number; first: Token; last: Token } {
    const first = this.peek;
    let sign = 1;
    if (this.is('-')) {
      this.next();
      sign = -1;
    }

    const token = this.peek;
    if (token.type !== 'number') this.fail('integer');
    this.next();
    const value = parseInteger(token.value);
    if (value === null) throw new ProtobufSyntaxError('Invalid integer literal', token.range);
    return { value: sign * value, first, last: token };
  }

  // -- location helpers

  private set(path: JsonPath, first: Token, last: Token = first): void {
    this.ast.set(pathKey(path), { start: first.range.start, end: last.range.end });
  }

  private prev(): Token {
    return this.tokens[Math.max(this.pos - 1, 0)];
  }

  // -- error recovery

  // Skips the rest of a broken statement: up to and including the next ";" or a complete {...} block,
  // or up to (not including) a "}" that closes the enclosing block.
  private recover(): void {
    let depth = 0;
    while (this.peek.type !== 'eof') {
      if (this.is('{')) {
        depth++;
      } else if (this.is('}')) {
        if (depth === 0) return;
        depth--;
        if (depth === 0) {
          this.next();
          return;
        }
      } else if (this.is(';') && depth === 0) {
        this.next();
        return;
      }

      this.next();
    }
  }

  private statement(fn: () => void): void {
    const start = this.pos;
    try {
      fn();
    } catch (e) {
      if (!(e instanceof ProtobufSyntaxError)) throw e;
      this.diagnostics.push(error(e.message, e.range));
      if (this.pos === start && !this.is('}') && this.peek.type !== 'eof') this.next();
      this.recover();
    }
  }

  // Parses statements until the closing "}" of a block (which is consumed) or the end of input.
  private block(body: () => void): Token {
    while (!this.is('}')) {
      if (this.peek.type === 'eof') {
        this.fail('"}"');
      }

      if (this.is(';')) {
        this.next();
        continue;
      }

      this.statement(body);
    }

    return this.next();
  }

  // -- grammar

  parse(): ProtobufDocument {
    const doc: ProtobufDocument = {
      syntax: 'proto2',
      package: null,
      imports: [],
      options: {},
      messages: [],
      enums: [],
      services: [],
      extends: [],
    };

    while (this.peek.type !== 'eof') {
      if (this.is(';')) {
        this.next();
        continue;
      }

      this.statement(() => this.topLevel(doc));
    }

    return doc;
  }

  private topLevel(doc: ProtobufDocument): void {
    const token = this.peek;
    if (token.type !== 'ident') this.fail('a top-level declaration');

    switch (token.value) {
      case 'syntax':
      case 'edition': {
        this.next();
        this.expect('=');
        const { value, first, last } = this.string();
        const end = this.expect(';');
        if (token.value === 'syntax') {
          doc.syntax = value;
          this.set(['syntax'], first, last);
        } else {
          doc.syntax = 'editions';
          doc.edition = value;
          this.set(['syntax'], token, end);
          this.set(['edition'], first, last);
        }

        return;
      }

      case 'package': {
        this.next();
        const { value, first, last } = this.fullIdent();
        this.expect(';');
        doc.package = value;
        this.set(['package'], first, last);
        return;
      }

      case 'import': {
        this.next();
        let modifier: 'public' | 'weak' | undefined;
        if (this.is('public') || this.is('weak')) {
          modifier = this.next().value as 'public' | 'weak';
        }

        const { value, first, last } = this.string();
        const end = this.expect(';');
        const index = doc.imports.length;
        doc.imports.push({ path: value, ...(modifier !== void 0 && { modifier }) });
        this.set(['imports', index], token, end);
        this.set(['imports', index, 'path'], first, last);
        return;
      }

      case 'option':
        this.option(doc.options, ['options']);
        return;
      case 'message':
        this.message(doc.messages, ['messages']);
        return;
      case 'enum':
        this.enumDecl(doc.enums, ['enums']);
        return;
      case 'service':
        this.service(doc.services, ['services']);
        return;
      case 'extend':
        this.extend(doc.extends, ['extends']);
        return;
      default:
        this.fail('a top-level declaration');
    }
  }

  // option foo.bar = value;
  private option(options: ProtobufOptions, path: JsonPath): void {
    const start = this.expect('option');
    const { name, value } = this.optionAssignment();
    const end = this.expect(';');
    options[name] = value;
    this.set([...path, name], start, end);
  }

  // (custom.option).field = value
  private optionAssignment(): { name: string; value: ProtobufOptionValue; first: Token; last: Token } {
    const first = this.peek;
    let name = '';
    for (;;) {
      if (this.is('(')) {
        this.next();
        name += `(${this.fullIdent(true).value})`;
        this.expect(')');
      } else {
        name += this.ident().value;
      }

      if (!this.is('.')) break;
      this.next();
      name += '.';
    }

    this.expect('=');
    const value = this.constant();
    return { name, value, first, last: this.prev() };
  }

  private constant(): ProtobufOptionValue {
    const token = this.peek;
    if (token.type === 'string') return this.string().value;

    if (this.is('{')) {
      // aggregate (text format) value, kept as raw text
      const parts: string[] = [];
      let depth = 0;
      do {
        const t = this.next();
        if (t.type === 'eof') this.fail('"}"', t);
        if (this.is('{', t)) depth++;
        if (this.is('}', t)) depth--;
        parts.push(t.type === 'string' ? JSON.stringify(t.value) : t.value);
      } while (depth > 0);
      return parts.join(' ');
    }

    if (this.is('-') || this.is('+') || token.type === 'number') {
      let sign = 1;
      if (this.is('-') || this.is('+')) {
        sign = this.next().value === '-' ? -1 : 1;
      }

      const num = this.peek;
      if (num.type === 'ident' && (num.value === 'inf' || num.value === 'nan')) {
        this.next();
        return num.value === 'inf' ? sign * Infinity : NaN;
      }

      if (num.type !== 'number') this.fail('number');
      this.next();
      const value = parseNumber(num.value);
      if (value === null) throw new ProtobufSyntaxError('Invalid number literal', num.range);
      return sign * value;
    }

    if (token.type === 'ident') {
      const { value } = this.fullIdent();
      return value === 'true' ? true : value === 'false' ? false : value;
    }

    this.fail('a constant');
  }

  // [deprecated = true, json_name = "foo"]
  private fieldOptions(path: JsonPath): ProtobufOptions {
    const options: ProtobufOptions = {};
    if (!this.is('[')) return options;
    this.next();
    for (;;) {
      const { name, value, first, last } = this.optionAssignment();
      options[name] = value;
      this.set([...path, name], first, last);
      if (!this.is(',')) break;
      this.next();
    }

    this.expect(']');
    return options;
  }

  private message(messages: ProtobufMessage[], parentPath: JsonPath): void {
    const start = this.expect('message');
    const name = this.ident();
    const path = [...parentPath, messages.length];
    const message = newMessage(name.value, start.comment);
    messages.push(message);
    this.set([...path, 'name'], name);
    this.expect('{');
    this.messageBody(message, path, start);
  }

  // Parses the statements of a message after its "{"; `start` is the token the message declaration begins with.
  private messageBody(message: ProtobufMessage, path: JsonPath, start: Token): void {
    const end = this.block(() => {
      const token = this.peek;
      switch (token.value) {
        case 'message':
          this.message(message.messages, [...path, 'messages']);
          return;
        case 'enum':
          this.enumDecl(message.enums, [...path, 'enums']);
          return;
        case 'extend':
          this.extend(message.extends, [...path, 'extends']);
          return;
        case 'option':
          this.option(message.options, [...path, 'options']);
          return;
        case 'oneof':
          if (this.lookahead(1).type === 'ident') {
            this.oneof(message, path);
            return;
          }

          break;
        case 'reserved':
          if (!this.is('=', this.lookahead(2)) && !this.is('.', this.lookahead(1))) {
            this.reserved(message.reserved, [...path, 'reserved']);
            return;
          }

          break;
        case 'extensions':
          if (this.lookahead(1).type === 'number') {
            const first = this.next();
            this.ranges(message.extensions, [...path, 'extensions']);
            this.set([...path, 'extensions'], first, this.expect(';'));
            return;
          }

          break;
      }

      this.field(message.fields, [...path, 'fields'], message, path);
    });
    this.set(path, start, end);
  }

  private field(
    fields: ProtobufField[],
    parentPath: JsonPath,
    message: ProtobufMessage | null,
    messagePath: JsonPath,
  ): void {
    const start = this.peek;
    const index = fields.length;
    const path = [...parentPath, index];
    let label: ProtobufField['label'];
    // `optional foo = 1;` is a field of type "optional", `optional foo bar = 1;` a labelled one
    if (start.type === 'ident' && LABELS.has(start.value) && !this.is('=', this.lookahead(2))) {
      label = this.next().value as ProtobufField['label'];
      this.set([...path, 'label'], start);
    }

    let type: string;
    let keyType: string | undefined;
    let valueType: string | undefined;
    const typeStart = this.peek;

    if (this.is('group') && message !== null && this.lookahead(1).type === 'ident') {
      // proto2 group: becomes a nested message plus a field of that type
      this.next();
      const groupName = this.ident();
      this.expect('=');
      const number = this.int();
      const options = this.fieldOptions([...path, 'options']);
      const nestedPath = [...messagePath, 'messages', message.messages.length];
      const nested = newMessage(groupName.value, start.comment);
      message.messages.push(nested);
      this.set([...nestedPath, 'name'], groupName);
      this.expect('{');
      this.messageBody(nested, nestedPath, start);
      fields.push({
        name: groupName.value.toLowerCase(),
        type: groupName.value,
        number: number.value,
        ...(label !== void 0 && { label }),
        options,
        ...(start.comment !== void 0 && { comment: start.comment }),
      });
      this.set([...path, 'name'], groupName);
      this.set([...path, 'type'], groupName);
      this.set([...path, 'number'], number.first, number.last);
      this.set(path, start, this.prev());
      return;
    }

    if (this.is('map') && this.is('<', this.lookahead(1))) {
      this.next();
      this.next();
      const key = this.fullIdent();
      this.expect(',');
      const value = this.fullIdent(true);
      const close = this.expect('>');
      keyType = key.value;
      valueType = value.value;
      type = `map<${keyType}, ${valueType}>`;
      this.set([...path, 'type'], typeStart, close);
      this.set([...path, 'keyType'], key.first, key.last);
      this.set([...path, 'valueType'], value.first, value.last);
    } else {
      const t = this.fullIdent(true);
      type = t.value;
      this.set([...path, 'type'], t.first, t.last);
    }

    const name = this.ident();
    this.expect('=');
    const number = this.int();
    const options = this.fieldOptions([...path, 'options']);
    const end = this.expect(';');

    fields.push({
      name: name.value,
      type,
      number: number.value,
      ...(label !== void 0 && { label }),
      ...(keyType !== void 0 && { keyType, valueType }),
      options,
      ...(start.comment !== void 0 && { comment: start.comment }),
    });
    this.set([...path, 'name'], name);
    this.set([...path, 'number'], number.first, number.last);
    this.set(path, start, end);
  }

  private oneof(message: ProtobufMessage, messagePath: JsonPath): void {
    const start = this.expect('oneof');
    const name = this.ident();
    const path = [...messagePath, 'oneofs', message.oneofs.length];
    const oneof: ProtobufOneof = {
      name: name.value,
      fields: [],
      options: {},
      ...(start.comment !== void 0 && { comment: start.comment }),
    };
    message.oneofs.push(oneof);
    this.set([...path, 'name'], name);
    this.expect('{');
    const end = this.block(() => {
      if (this.is('option')) {
        this.option(oneof.options, [...path, 'options']);
      } else {
        this.field(oneof.fields, [...path, 'fields'], message, messagePath);
      }
    });
    this.set(path, start, end);
  }

  private ranges(ranges: ProtobufReserved['ranges'], path: JsonPath): void {
    for (;;) {
      const from = this.int();
      let to: number | 'max' = from.value;
      let last = from.last;
      if (this.is('to')) {
        this.next();
        if (this.is('max')) {
          last = this.next();
          to = 'max';
        } else {
          const t = this.int();
          to = t.value;
          last = t.last;
        }
      }

      this.set([...path, ranges.length], from.first, last);
      ranges.push({ start: from.value, end: to });
      if (!this.is(',')) break;
      this.next();
    }
  }

  private reserved(reserved: ProtobufReserved, path: JsonPath): void {
    const start = this.expect('reserved');
    if (this.peek.type === 'string' || this.peek.type === 'ident') {
      for (;;) {
        let token: { value: string; first: Token; last: Token };
        if (this.peek.type === 'string') {
          token = this.string();
        } else {
          const ident = this.ident();
          token = { value: ident.value, first: ident, last: ident };
        }

        this.set([...path, 'names', reserved.names.length], token.first, token.last);
        reserved.names.push(token.value);
        if (!this.is(',')) break;
        this.next();
      }
    } else {
      this.ranges(reserved.ranges, [...path, 'ranges']);
    }

    const end = this.expect(';');
    if (!this.ast.has(pathKey(path))) this.set(path, start, end);
  }

  private enumDecl(enums: ProtobufEnum[], parentPath: JsonPath): void {
    const start = this.expect('enum');
    const name = this.ident();
    const path = [...parentPath, enums.length];
    const node: ProtobufEnum = {
      name: name.value,
      values: [],
      options: {},
      reserved: emptyReserved(),
      ...(start.comment !== void 0 && { comment: start.comment }),
    };
    enums.push(node);
    this.set([...path, 'name'], name);
    this.expect('{');
    const end = this.block(() => {
      if (this.is('option')) {
        this.option(node.options, [...path, 'options']);
      } else if (this.is('reserved') && !this.is('=', this.lookahead(1))) {
        this.reserved(node.reserved, [...path, 'reserved']);
      } else {
        const valueName = this.ident();
        const valuePath = [...path, 'values', node.values.length];
        this.expect('=');
        const number = this.int();
        const options = this.fieldOptions([...valuePath, 'options']);
        const valueEnd = this.expect(';');
        node.values.push({
          name: valueName.value,
          number: number.value,
          options,
          ...(valueName.comment !== void 0 && { comment: valueName.comment }),
        });
        this.set([...valuePath, 'name'], valueName);
        this.set([...valuePath, 'number'], number.first, number.last);
        this.set(valuePath, valueName, valueEnd);
      }
    });
    this.set(path, start, end);
  }

  private service(services: ProtobufService[], parentPath: JsonPath): void {
    const start = this.expect('service');
    const name = this.ident();
    const path = [...parentPath, services.length];
    const service: ProtobufService = {
      name: name.value,
      rpcs: [],
      options: {},
      ...(start.comment !== void 0 && { comment: start.comment }),
    };
    services.push(service);
    this.set([...path, 'name'], name);
    this.expect('{');
    const end = this.block(() => {
      if (this.is('option')) {
        this.option(service.options, [...path, 'options']);
      } else {
        this.rpc(service.rpcs, [...path, 'rpcs']);
      }
    });
    this.set(path, start, end);
  }

  private rpc(rpcs: ProtobufRpc[], parentPath: JsonPath): void {
    const start = this.expect('rpc');
    const name = this.ident();
    const path = [...parentPath, rpcs.length];
    const rpc: ProtobufRpc = {
      name: name.value,
      requestType: '',
      requestStream: false,
      responseType: '',
      responseStream: false,
      options: {},
      ...(start.comment !== void 0 && { comment: start.comment }),
    };
    rpcs.push(rpc);
    this.set([...path, 'name'], name);

    const messageType = (kind: 'request' | 'response'): void => {
      this.expect('(');
      const next = this.lookahead(1);
      if (this.is('stream') && (next.type === 'ident' || this.is('.', next))) {
        this.set([...path, `${kind}Stream`], this.next());
        rpc[`${kind}Stream`] = true;
      }

      const type = this.fullIdent(true);
      rpc[`${kind}Type`] = type.value;
      this.set([...path, `${kind}Type`], type.first, type.last);
      this.expect(')');
    };

    messageType('request');
    this.expect('returns');
    messageType('response');

    let end: Token;
    if (this.is('{')) {
      this.next();
      end = this.block(() => this.option(rpc.options, [...path, 'options']));
    } else {
      end = this.expect(';');
    }

    this.set(path, start, end);
  }

  private extend(extendsList: ProtobufExtend[], parentPath: JsonPath): void {
    const start = this.expect('extend');
    const extendee = this.fullIdent(true);
    const path = [...parentPath, extendsList.length];
    const node: ProtobufExtend = {
      extendee: extendee.value,
      fields: [],
      ...(start.comment !== void 0 && { comment: start.comment }),
    };
    extendsList.push(node);
    this.set([...path, 'extendee'], extendee.first, extendee.last);
    this.expect('{');
    const end = this.block(() => this.field(node.fields, [...path, 'fields'], null, path));
    this.set(path, start, end);
  }
}

function newMessage(name: string, comment: string | undefined): ProtobufMessage {
  return {
    name,
    fields: [],
    oneofs: [],
    messages: [],
    enums: [],
    extends: [],
    reserved: emptyReserved(),
    extensions: [],
    options: {},
    ...(comment !== void 0 && { comment }),
  };
}

function parseInteger(literal: string): number | null {
  if (/^0[xX][0-9A-Fa-f]+$/.test(literal)) return parseInt(literal.slice(2), 16);
  if (/^0[0-7]+$/.test(literal)) return parseInt(literal.slice(1), 8);
  if (/^(?:0|[1-9][0-9]*)$/.test(literal)) return parseInt(literal, 10);
  return null;
}

function parseNumber(literal: string): number | null {
  const int = parseInteger(literal);
  if (int !== null) return int;
  if (/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][-+]?[0-9]+)?$/.test(literal)) return parseFloat(literal);
  return null;
}

const pathKey = (path: JsonPath): string => path.map(String).join('\u0000');

export const parseProtobuf = (input: string): ProtobufParserResult => {
  const diagnostics: IDiagnostic[] = [];
  const { tokens, lineMap } = tokenize(input, diagnostics);
  const parser = new Parser(tokens, diagnostics);
  const data = parser.parse();
  const last = tokens[tokens.length - 1];
  parser.ast.set(pathKey([]), { start: { line: 0, character: 0 }, end: last.range.end });

  return { data, ast: parser.ast, lineMap, diagnostics };
};

export const getLocationForJsonPathInProtobuf: GetLocationForJsonPath<ProtobufParserResult> = (
  result,
  path,
  closest = false,
) => {
  for (let length = path.length; length >= 0; length--) {
    const range = result.ast.get(pathKey(path.slice(0, length)));
    if (range !== void 0) return { range };
    if (!closest) return;
  }

  return;
};

export const Protobuf: IParser<ProtobufParserResult> = {
  parse: parseProtobuf,
  getLocationForJsonPath: getLocationForJsonPathInProtobuf,
  trapAccess: obj => obj,
};

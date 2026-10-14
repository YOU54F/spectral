import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlDocument, XmlElement } from '@stoplight/spectral-parsers';
import type { JsonPath } from '@stoplight/types';

export const WSDL = 'http://schemas.xmlsoap.org/wsdl/';
export const SOAP11 = 'http://schemas.xmlsoap.org/wsdl/soap/';
export const SOAP12 = 'http://schemas.xmlsoap.org/wsdl/soap12/';
export const HTTP = 'http://schemas.xmlsoap.org/wsdl/http/';
export const XSD = 'http://www.w3.org/2001/XMLSchema';
export const SOAP_NAMESPACES = [SOAP11, SOAP12];

export type Located = { element: XmlElement; path: JsonPath };

export type QName = { namespace: string | null; localName: string };

export function children(parent: Located, namespace: string | string[], localName?: string): Located[] {
  const namespaces = Array.isArray(namespace) ? namespace : [namespace];
  const result: Located[] = [];
  parent.element.children.forEach((element, i) => {
    if (
      element.namespace !== null &&
      namespaces.includes(element.namespace) &&
      (localName === void 0 || element.localName === localName)
    ) {
      result.push({ element, path: [...parent.path, 'children', i] });
    }
  });

  return result;
}

// The value of an unprefixed attribute, which is what WSDL and XSD use for their own attributes.
export function attr(element: XmlElement, name: string): string | undefined {
  return element.attributes[name]?.value;
}

export const attrPath = (located: Located, name: string): JsonPath => [...located.path, 'attributes', name, 'value'];

// Resolves a QName attribute value such as "tns:Pet" against the namespaces in scope of the element.
// An unprefixed QName is in the default namespace, or in no namespace when there is none.
export function resolveQName(element: XmlElement, value: string): QName | { unbound: string } {
  const trimmed = value.trim();
  const colon = trimmed.indexOf(':');
  if (colon === -1) return { namespace: element.namespaces[''] ?? null, localName: trimmed };
  const prefix = trimmed.slice(0, colon);
  const namespace = prefix === 'xml' ? 'http://www.w3.org/XML/1998/namespace' : element.namespaces[prefix];
  if (namespace === void 0) return { unbound: prefix };
  return { namespace, localName: trimmed.slice(colon + 1) };
}

export const formatQName = ({ namespace, localName }: QName): string => `{${namespace ?? ''}}${localName}`;

// A document parsed by the WSDL parser. After resolution, each entry of "imports" is the document that the
// corresponding import element (see importLocations) points at, or still a { $ref } when it could not be loaded.
export type WsdlDocument = XmlDocument & { imports?: unknown[] };

export type ImportLocation = { located: Located; attribute: 'location' | 'schemaLocation'; ref: string | null };

const SCHEMA_IMPORTS = ['import', 'include', 'redefine', 'override'];

// The $ref for an import location: relative references, file paths and http(s) URLs are followed, other schemes are not.
function toRef(location: string | undefined): string | null {
  const ref = (location ?? '').trim().replace(/#.*$/, '');
  if (ref.length === 0) return null;
  const scheme = /^([a-z][a-z\d+.-]+):/i.exec(ref);
  return scheme === null || ['http', 'https', 'file'].includes(scheme[1].toLowerCase()) ? ref : null;
}

function schemaImports(schema: Located): ImportLocation[] {
  return children(schema, XSD)
    .filter(({ element }) => SCHEMA_IMPORTS.includes(element.localName))
    .map(located => ({
      located,
      attribute: 'schemaLocation',
      ref: toRef(attr(located.element, 'schemaLocation')),
    }));
}

// The wsdl:import elements of a WSDL document and the xsd:import, xsd:include, xsd:redefine and xsd:override
// elements of its inline schemas, or of an XML Schema document, in document order.
export function importLocations(root: Located): ImportLocation[] {
  const { namespace, localName } = root.element;
  if (namespace === XSD && localName === 'schema') return schemaImports(root);
  if (namespace !== WSDL || localName !== 'definitions') return [];

  return [
    ...children(root, WSDL, 'import').map<ImportLocation>(located => ({
      located,
      attribute: 'location',
      ref: toRef(attr(located.element, 'location')),
    })),
    ...children(root, WSDL, 'types').flatMap(types => children(types, XSD, 'schema').flatMap(schemaImports)),
  ];
}

type Schema = { elements: Set<string>; types: Set<string>; open: boolean };

export type Definitions = {
  root: Located;
  targetNamespace: string | null;
  messages: Map<string, Located>;
  portTypes: Map<string, Located>;
  bindings: Map<string, Located>;
  services: Map<string, Located>;
  // messages, port types and bindings of this document and of the imported WSDL documents, by formatQName
  components: Record<Kind, Map<string, Located>>;
  // the target namespaces of this document and of the imported WSDL documents
  wsdlNamespaces: Set<string | null>;
  // the namespaces brought in by imports that could not be loaded; references into them are not checked
  unchecked: Set<string>;
  // top-level elements and types of the inline and imported schemas, by target namespace
  schemas: Map<string | null, Schema>;
};

const cache = new WeakMap<XmlElement, Definitions>();

const EMPTY_ROOT: XmlElement = {
  name: '',
  prefix: null,
  localName: '',
  namespace: null,
  attributes: {},
  namespaces: {},
  children: [],
};

function byName(located: Located[]): Map<string, Located> {
  const map = new Map<string, Located>();
  for (const item of located) {
    const name = attr(item.element, 'name');
    if (name !== void 0 && !map.has(name)) map.set(name, item);
  }

  return map;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The root of an imported document, when the resolver loaded it and it was parsed as XML.
function importedRoot(value: unknown, path: JsonPath): { doc: WsdlDocument; root: Located } | null {
  if (!isPlainObject(value) || value.kind !== 'xml' || !isPlainObject(value.root)) return null;
  const doc = value as WsdlDocument;
  return { doc, root: { element: doc.root as XmlElement, path: [...path, 'root'] } };
}

class Collector {
  readonly components: Definitions['components'] = { messages: new Map(), portTypes: new Map(), bindings: new Map() };
  readonly wsdlNamespaces = new Set<string | null>();
  readonly unchecked = new Set<string>();
  readonly schemas = new Map<string | null, Schema>();
  readonly #visited = new Set<XmlElement>();

  // Adds a WSDL or XML Schema document. chameleon is the namespace of the including schema, for xsd:include.
  // Returns false when the document is neither.
  document(doc: WsdlDocument, root: Located, chameleon?: string | null): boolean {
    const { namespace, localName } = root.element;
    const isWsdl = namespace === WSDL && localName === 'definitions';
    const isSchema = namespace === XSD && localName === 'schema';
    if (!isWsdl && !isSchema) return false;
    if (this.#visited.has(root.element)) return true;
    this.#visited.add(root.element);

    // the documents loaded for the import elements of this document
    const loaded = new Map<XmlElement, { doc: WsdlDocument; root: Located }>();
    let i = 0;
    for (const { located, ref } of importLocations(root)) {
      if (ref === null) continue;
      const index = i++;
      const target = importedRoot(doc.imports?.[index], [...root.path.slice(0, -1), 'imports', index]);
      if (target !== null) loaded.set(located.element, target);
    }

    if (isSchema) {
      this.schema(root, loaded, chameleon);
      return true;
    }

    const targetNamespace = attr(root.element, 'targetNamespace') ?? null;
    this.wsdlNamespaces.add(targetNamespace);
    for (const [kind, localName] of [
      ['messages', 'message'],
      ['portTypes', 'portType'],
      ['bindings', 'binding'],
    ] as const) {
      for (const [name, located] of byName(children(root, WSDL, localName))) {
        const key = formatQName({ namespace: targetNamespace, localName: name });
        if (!this.components[kind].has(key)) this.components[kind].set(key, located);
      }
    }

    for (const imp of children(root, WSDL, 'import')) {
      const target = loaded.get(imp.element);
      const ns = attr(imp.element, 'namespace');
      if ((target === void 0 || !this.document(target.doc, target.root)) && ns !== void 0) this.unchecked.add(ns);
    }

    for (const types of children(root, WSDL, 'types')) {
      for (const schema of children(types, XSD, 'schema')) {
        this.schema(schema, loaded);
      }
    }

    return true;
  }

  schema(
    schema: Located,
    loaded: Map<XmlElement, { doc: WsdlDocument; root: Located }>,
    chameleon?: string | null,
  ): void {
    const namespace = attr(schema.element, 'targetNamespace') ?? chameleon ?? null;
    const entry = this.schemas.get(namespace) ?? { elements: new Set<string>(), types: new Set<string>(), open: false };
    this.schemas.set(namespace, entry);
    for (const child of children(schema, XSD)) {
      const name = attr(child.element, 'name');
      const target = loaded.get(child.element);
      switch (child.element.localName) {
        case 'element':
          if (name !== void 0) entry.elements.add(name);
          break;
        case 'complexType':
        case 'simpleType':
          if (name !== void 0) entry.types.add(name);
          break;
        case 'import': {
          const ns = attr(child.element, 'namespace');
          if ((target === void 0 || !this.document(target.doc, target.root)) && ns !== void 0) this.unchecked.add(ns);
          break;
        }

        case 'include':
        case 'redefine':
        case 'override':
          // the components come from another file, which takes the namespace of this schema when it has none
          if (target === void 0 || !this.document(target.doc, target.root, namespace)) entry.open = true;
          break;
      }
    }
  }
}

// The definitions of a WSDL document, including those of the documents it imports, as far as they were loaded.
export function definitions(doc: WsdlDocument, path: JsonPath): Definitions {
  const element = doc.root ?? EMPTY_ROOT;
  const cached = cache.get(element);
  if (cached !== void 0 && cached.root.path.join('/') === [...path, 'root'].join('/')) return cached;

  const root: Located = { element, path: [...path, 'root'] };
  const collector = new Collector();
  collector.document(doc, root);

  const result: Definitions = {
    root,
    targetNamespace: attr(element, 'targetNamespace') ?? null,
    messages: byName(children(root, WSDL, 'message')),
    portTypes: byName(children(root, WSDL, 'portType')),
    bindings: byName(children(root, WSDL, 'binding')),
    services: byName(children(root, WSDL, 'service')),
    components: collector.components,
    wsdlNamespaces: collector.wsdlNamespaces,
    unchecked: collector.unchecked,
    schemas: collector.schemas,
  };

  cache.set(element, result);
  return result;
}

type Kind = 'messages' | 'portTypes' | 'bindings';
const KIND_NAMES: Record<Kind, string> = { messages: 'Message', portTypes: 'Port type', bindings: 'Binding' };

// Checks that a QName attribute refers to a message, port type or binding of this document or of an imported one.
// Returns the referenced element, or null after pushing a result.
export function reference(
  defs: Definitions,
  from: Located,
  attribute: string,
  kind: Kind,
  results: IFunctionResult[],
): Located | null {
  const value = attr(from.element, attribute);
  if (value === void 0) {
    results.push({
      message: `"${from.element.localName}" must have a "${attribute}" attribute.`,
      path: from.path,
    });
    return null;
  }

  const qname = resolveQName(from.element, value);
  if ('unbound' in qname) {
    results.push({
      message: `Namespace prefix "${qname.unbound}" of "${value}" is not bound.`,
      path: attrPath(from, attribute),
    });
    return null;
  }

  const target = defs.components[kind].get(formatQName(qname));
  if (target !== void 0) return target;
  if (qname.namespace !== null && defs.unchecked.has(qname.namespace)) return null;

  if (!defs.wsdlNamespaces.has(qname.namespace)) {
    results.push({
      message: `${KIND_NAMES[kind]} "${value}" resolves to namespace "${qname.namespace ?? ''}", not to the target namespace "${defs.targetNamespace ?? ''}".`,
      path: attrPath(from, attribute),
    });
    return null;
  }

  results.push({
    message: `${KIND_NAMES[kind]} "${value}" is not defined.`,
    path: attrPath(from, attribute),
  });
  return null;
}

// The soap:binding or soap12:binding of a binding, if any.
export const soapBinding = (binding: Located): Located | undefined => children(binding, SOAP_NAMESPACES, 'binding')[0];

export const isHttpBinding = (binding: Located): boolean => children(binding, HTTP, 'binding').length > 0;

export function hasDocumentation(located: Located): boolean {
  return children(located, WSDL, 'documentation').some(
    ({ element }) => (element.text ?? '').trim().length > 0 || element.children.length > 0,
  );
}

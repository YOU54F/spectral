import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
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

export type Definitions = {
  root: Located;
  targetNamespace: string | null;
  messages: Map<string, Located>;
  portTypes: Map<string, Located>;
  bindings: Map<string, Located>;
  services: Map<string, Located>;
  // the namespaces that are wsdl:import-ed, or xsd:import-ed by an inline schema; references into them are not checked
  imported: Set<string>;
  // top-level elements and types of the inline schemas, by target namespace
  schemas: Map<string | null, { elements: Set<string>; types: Set<string>; open: boolean }>;
};

const cache = new WeakMap<XmlElement, Definitions>();

function byName(located: Located[]): Map<string, Located> {
  const map = new Map<string, Located>();
  for (const item of located) {
    const name = attr(item.element, 'name');
    if (name !== void 0 && !map.has(name)) map.set(name, item);
  }

  return map;
}

export function definitions(element: XmlElement, path: JsonPath): Definitions {
  const cached = cache.get(element);
  if (cached !== void 0 && cached.root.path.join('/') === path.join('/')) return cached;

  const root: Located = { element, path };
  const imported = new Set<string>();
  const schemas: Definitions['schemas'] = new Map();

  for (const imp of children(root, WSDL, 'import')) {
    const namespace = attr(imp.element, 'namespace');
    if (namespace !== void 0) imported.add(namespace);
  }

  for (const types of children(root, WSDL, 'types')) {
    for (const schema of children(types, XSD, 'schema')) {
      const namespace = attr(schema.element, 'targetNamespace') ?? null;
      const entry = schemas.get(namespace) ?? { elements: new Set<string>(), types: new Set<string>(), open: false };
      schemas.set(namespace, entry);
      for (const child of children(schema, XSD)) {
        const name = attr(child.element, 'name');
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
            if (ns !== void 0) imported.add(ns);
            break;
          }

          case 'include':
          case 'redefine':
          case 'override':
            // components may come from another file
            entry.open = true;
            break;
        }
      }
    }
  }

  const result: Definitions = {
    root,
    targetNamespace: attr(element, 'targetNamespace') ?? null,
    messages: byName(children(root, WSDL, 'message')),
    portTypes: byName(children(root, WSDL, 'portType')),
    bindings: byName(children(root, WSDL, 'binding')),
    services: byName(children(root, WSDL, 'service')),
    imported,
    schemas,
  };

  cache.set(element, result);
  return result;
}

type Kind = 'messages' | 'portTypes' | 'bindings';
const KIND_NAMES: Record<Kind, string> = { messages: 'Message', portTypes: 'Port type', bindings: 'Binding' };

// Checks that a QName attribute refers to a message, port type or binding of this document.
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

  if (qname.namespace !== defs.targetNamespace) {
    if (qname.namespace !== null && defs.imported.has(qname.namespace)) return null;
    results.push({
      message: `${KIND_NAMES[kind]} "${value}" resolves to namespace "${qname.namespace ?? ''}", not to the target namespace "${defs.targetNamespace ?? ''}".`,
      path: attrPath(from, attribute),
    });
    return null;
  }

  const target = defs[kind].get(qname.localName);
  if (target === void 0) {
    results.push({
      message: `${KIND_NAMES[kind]} "${value}" is not defined.`,
      path: attrPath(from, attribute),
    });
    return null;
  }

  return target;
}

// The soap:binding or soap12:binding of a binding, if any.
export const soapBinding = (binding: Located): Located | undefined => children(binding, SOAP_NAMESPACES, 'binding')[0];

export const isHttpBinding = (binding: Located): boolean => children(binding, HTTP, 'binding').length > 0;

export function hasDocumentation(located: Located): boolean {
  return children(located, WSDL, 'documentation').some(
    ({ element }) => (element.text ?? '').trim().length > 0 || element.children.length > 0,
  );
}

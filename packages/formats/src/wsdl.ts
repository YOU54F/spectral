import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

const WSDL_NAMESPACE = 'http://schemas.xmlsoap.org/wsdl/';

// Matches WSDL 1.1 documents parsed by the Xml parser in @stoplight/spectral-parsers:
// the root element is <definitions> in the WSDL 1.1 namespace.
// WSDL 2.0 (<description> in http://www.w3.org/ns/wsdl) is not matched.
const isWsdl = (document: unknown): document is { kind: 'xml'; root: Record<string, unknown> } =>
  isPlainObject(document) &&
  document.kind === 'xml' &&
  isPlainObject(document.root) &&
  document.root.localName === 'definitions' &&
  document.root.namespace === WSDL_NAMESPACE;

export const wsdl: Format = isWsdl;
wsdl.displayName = 'WSDL 1.1';

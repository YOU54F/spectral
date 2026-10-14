import { wsdl } from '../wsdl';

describe('WSDL format', () => {
  // the shape produced by the Xml parser of @stoplight/spectral-parsers
  const element = (localName: string, namespace: string | null) => ({
    name: localName,
    prefix: null,
    localName,
    namespace,
    attributes: {},
    namespaces: {},
    children: [],
  });

  it('recognizes WSDL 1.1 documents', () => {
    expect(wsdl({ kind: 'xml', root: element('definitions', 'http://schemas.xmlsoap.org/wsdl/') }, null)).toBe(true);
  });

  it.each([
    { kind: 'xml', root: element('description', 'http://www.w3.org/ns/wsdl') },
    { kind: 'xml', root: element('definitions', null) },
    { kind: 'xml', root: element('definitions', 'http://schemas.xmlsoap.org/wsdl/soap/') },
    { kind: 'xml', root: element('schema', 'http://www.w3.org/2001/XMLSchema') },
    { kind: 'xml', root: null },
    { root: element('definitions', 'http://schemas.xmlsoap.org/wsdl/') },
    { openapi: '3.1.0', info: {}, paths: {} },
    { definitions: {}, swagger: '2.0' },
    '<definitions xmlns="http://schemas.xmlsoap.org/wsdl/"/>',
    null,
  ])('does not recognize %p', document => {
    expect(wsdl(document, null)).toBe(false);
  });
});

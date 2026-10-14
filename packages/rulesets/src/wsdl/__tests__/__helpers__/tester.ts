import { Document } from '@stoplight/spectral-core';
import { Xml, XmlDocument, XmlParserResult } from '@stoplight/spectral-parsers';
import testRule, { createWithRules } from '../../../__tests__/__helpers__/tester';

export const wsdlDoc = (source: string): Document<XmlDocument, XmlParserResult> =>
  new Document(source, Xml, 'test.wsdl');

const NAMESPACES = [
  'xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"',
  'xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"',
  'xmlns:soap12="http://schemas.xmlsoap.org/wsdl/soap12/"',
  'xmlns:xsd="http://www.w3.org/2001/XMLSchema"',
  'xmlns:tns="urn:example:petstore"',
  'targetNamespace="urn:example:petstore"',
].join(' ');

// Wraps the body in a wsdl:definitions element on line 0, so the body starts on line 1.
export const definitions = (body: string): Document<XmlDocument, XmlParserResult> =>
  wsdlDoc(`<wsdl:definitions ${NAMESPACES}>\n${body}\n</wsdl:definitions>\n`);

export { testRule as default, createWithRules };

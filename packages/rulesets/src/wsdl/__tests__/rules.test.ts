import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { definitions, wsdlDoc } from './__helpers__/tester';
import { valid } from './__helpers__/valid';

const range = (line: number, start: number, end: number) => ({
  start: { line, character: start },
  end: { line, character: end },
});

const SCHEMA = `<wsdl:types>
<xsd:schema targetNamespace="urn:example:petstore">
<xsd:element name="Pet"/>
<xsd:complexType name="PetType"/>
</xsd:schema>
</wsdl:types>`;

testRule('wsdl-message-part-reference', [
  { name: 'parts refer to inline schema components', document: wsdlDoc(valid), errors: [] },
  {
    name: 'XSD built-in types and imported namespaces are not checked',
    document: definitions(
      `<wsdl:import namespace="urn:other" location="other.wsdl"/>
<wsdl:message name="A" xmlns:o="urn:other"><wsdl:part name="a" type="xsd:string"/><wsdl:part name="b" element="o:Missing"/></wsdl:message>`,
    ),
    errors: [],
  },
  {
    name: 'schemas with an include are open',
    document: definitions(
      `<wsdl:types><xsd:schema targetNamespace="urn:example:petstore"><xsd:include schemaLocation="pets.xsd"/></xsd:schema></wsdl:types>
<wsdl:message name="A"><wsdl:part name="a" element="tns:Pet"/></wsdl:message>`,
    ),
    errors: [],
  },
  {
    name: 'invalid parts',
    document: definitions(
      `${SCHEMA}
<wsdl:message name="A">
<wsdl:part name="a"/>
<wsdl:part name="b" element="tns:Pet" type="tns:PetType"/>
<wsdl:part name="c" element="x:Pet"/>
<wsdl:part name="d" element="tns:Missing"/>
<wsdl:part name="e" type="tns:Pet"/>
</wsdl:message>`,
    ),
    errors: [
      {
        message: 'Part "a" must have an "element" or a "type" attribute.',
        path: ['root', 'children', '1', 'children', '0'],
        range: range(8, 0, 21),
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Part "b" must not have both an "element" and a "type" attribute.',
        path: ['root', 'children', '1', 'children', '1', 'attributes', 'type', 'value'],
        range: range(9, 44, 55),
      },
      {
        message: 'Namespace prefix "x" of "x:Pet" is not bound.',
        path: ['root', 'children', '1', 'children', '2', 'attributes', 'element', 'value'],
        range: range(10, 29, 34),
      },
      {
        message: 'Element "tns:Missing" is not defined in the schema for "urn:example:petstore".',
        path: ['root', 'children', '1', 'children', '3', 'attributes', 'element', 'value'],
      },
      {
        message: 'Type "tns:Pet" is not defined in the schema for "urn:example:petstore".',
        path: ['root', 'children', '1', 'children', '4', 'attributes', 'type', 'value'],
      },
    ],
  },
  {
    name: 'no inline schema for the target namespace',
    document: definitions('<wsdl:message name="A"><wsdl:part name="a" element="tns:Pet"/></wsdl:message>'),
    errors: [
      {
        message: 'Element "tns:Pet" is not defined: no schema has the namespace "urn:example:petstore".',
        path: ['root', 'children', '0', 'children', '0', 'attributes', 'element', 'value'],
      },
    ],
  },
]);

testRule('wsdl-operation-message-reference', [
  { name: 'operations refer to defined messages', document: wsdlDoc(valid), errors: [] },
  {
    name: 'undefined, unbound and foreign messages',
    document: definitions(
      `<wsdl:message name="A"/>
<wsdl:portType name="P">
<wsdl:operation name="O">
<wsdl:input message="tns:A"/>
<wsdl:output message="tns:B"/>
<wsdl:fault name="F" message="x:A"/>
<wsdl:fault name="G" message="A"/>
<wsdl:fault name="H"/>
</wsdl:operation>
</wsdl:portType>`,
    ),
    errors: [
      {
        message: 'Message "tns:B" is not defined.',
        path: ['root', 'children', '1', 'children', '0', 'children', '1', 'attributes', 'message', 'value'],
        range: range(5, 22, 27),
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Namespace prefix "x" of "x:A" is not bound.' },
      {
        message: 'Message "A" resolves to namespace "", not to the target namespace "urn:example:petstore".',
      },
      {
        message: '"fault" must have a "message" attribute.',
        path: ['root', 'children', '1', 'children', '0', 'children', '4'],
      },
    ],
  },
]);

testRule('wsdl-binding-port-type-reference', [
  { name: 'bindings refer to defined port types', document: wsdlDoc(valid), errors: [] },
  {
    name: 'undefined port type',
    document: definitions(
      '<wsdl:binding name="B" type="tns:Missing"><soap:binding transport="http://schemas.xmlsoap.org/soap/http"/></wsdl:binding>',
    ),
    errors: [
      {
        message: 'Port type "tns:Missing" is not defined.',
        path: ['root', 'children', '0', 'attributes', 'type', 'value'],
        range: range(1, 29, 40),
      },
    ],
  },
]);

testRule('wsdl-binding-operation-reference', [
  { name: 'binding operations are port type operations', document: wsdlDoc(valid), errors: [] },
  {
    name: 'unknown binding operation',
    document: definitions(
      `<wsdl:portType name="P"><wsdl:operation name="A"/></wsdl:portType>
<wsdl:binding name="B" type="tns:P">
<wsdl:operation name="A"/>
<wsdl:operation name="Z"/>
<wsdl:operation/>
</wsdl:binding>`,
    ),
    errors: [
      {
        message: 'Operation "Z" is not defined in port type "P".',
        path: ['root', 'children', '1', 'children', '1', 'attributes', 'name', 'value'],
        range: range(4, 22, 23),
      },
      {
        message: 'Binding operations must have a "name" attribute.',
        path: ['root', 'children', '1', 'children', '2'],
      },
    ],
  },
]);

testRule('wsdl-port-binding-reference', [
  { name: 'ports refer to defined bindings', document: wsdlDoc(valid), errors: [] },
  {
    name: 'undefined binding',
    document: definitions(
      '<wsdl:service name="S"><wsdl:port name="P" binding="tns:Missing"><soap:address location="https://example.com"/></wsdl:port></wsdl:service>',
    ),
    errors: [
      {
        message: 'Binding "tns:Missing" is not defined.',
        path: ['root', 'children', '0', 'children', '0', 'attributes', 'binding', 'value'],
        range: range(1, 52, 63),
      },
    ],
  },
]);

testRule('wsdl-binding-operations-complete', [
  { name: 'all operations are bound', document: wsdlDoc(valid), errors: [] },
  {
    name: 'missing operation',
    document: definitions(
      `<wsdl:portType name="P"><wsdl:operation name="A"/><wsdl:operation name="B"/></wsdl:portType>
<wsdl:binding name="Bind" type="tns:P"><wsdl:operation name="A"/></wsdl:binding>`,
    ),
    errors: [
      {
        message: 'Binding "Bind" does not bind operation "B" of port type "P".',
        path: ['root', 'children', '1', 'attributes', 'name', 'value'],
        range: range(2, 20, 24),
      },
    ],
  },
]);

testRule('wsdl-no-encoded-use', [
  { name: 'literal use', document: wsdlDoc(valid), errors: [] },
  {
    name: 'encoded use in SOAP 1.1 and 1.2',
    document: definitions(
      `<wsdl:binding name="B" type="tns:P">
<wsdl:operation name="A">
<wsdl:input><soap:body use="encoded" encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"/></wsdl:input>
<wsdl:output><soap12:header message="tns:H" part="h" use="encoded"/></wsdl:output>
</wsdl:operation>
</wsdl:binding>`,
    ),
    errors: [
      {
        message: 'soap:body must use "literal", not "encoded".',
        path: [
          'root',
          'children',
          '0',
          'children',
          '0',
          'children',
          '0',
          'children',
          '0',
          'attributes',
          'use',
          'value',
        ],
        range: range(3, 28, 35),
        severity: DiagnosticSeverity.Error,
      },
      { message: 'soap12:header must use "literal", not "encoded".' },
    ],
  },
]);

testRule('wsdl-document-literal-style', [
  { name: 'document style', document: wsdlDoc(valid), errors: [] },
  {
    name: 'rpc style',
    document: definitions(
      `<wsdl:binding name="B" type="tns:P">
<soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
<wsdl:operation name="A"><soap:operation style="rpc"/></wsdl:operation>
</wsdl:binding>`,
    ),
    errors: [
      {
        message: 'Binding "B" uses rpc style, prefer document/literal.',
        path: ['root', 'children', '0', 'children', '0', 'attributes', 'style', 'value'],
        range: range(2, 21, 24),
        severity: DiagnosticSeverity.Warning,
      },
      { message: 'Operation "A" uses rpc style, prefer document/literal.' },
    ],
  },
]);

testRule('wsdl-binding-style-consistent', [
  { name: 'one style', document: wsdlDoc(valid), errors: [] },
  {
    name: 'mixed styles',
    document: definitions(
      `<wsdl:binding name="B" type="tns:P">
<soap12:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
<wsdl:operation name="A"/>
<wsdl:operation name="C"><soap12:operation style="document"/></wsdl:operation>
</wsdl:binding>`,
    ),
    errors: [
      {
        message: 'Operation "C" uses document style, but binding "B" also has rpc style operations.',
        path: ['root', 'children', '0', 'children', '2', 'children', '0', 'attributes', 'style', 'value'],
        range: range(4, 50, 58),
      },
    ],
  },
]);

testRule('wsdl-soap-binding-transport', [
  { name: 'SOAP 1.1 and 1.2 bindings with a transport', document: wsdlDoc(valid), errors: [] },
  {
    name: 'HTTP bindings are skipped',
    document: definitions(
      '<wsdl:binding name="B" type="tns:P" xmlns:http="http://schemas.xmlsoap.org/wsdl/http/"><http:binding verb="GET"/></wsdl:binding>',
    ),
    errors: [],
  },
  {
    name: 'missing soap:binding and transport',
    document: definitions(
      `<wsdl:binding name="A" type="tns:P"/>
<wsdl:binding name="B" type="tns:P"><soap12:binding style="document"/></wsdl:binding>`,
    ),
    errors: [
      {
        message: 'Binding "A" must have a soap:binding or soap12:binding.',
        path: ['root', 'children', '0', 'attributes', 'name', 'value'],
        range: range(1, 20, 21),
      },
      {
        message: 'The soap12:binding of binding "B" must have a "transport".',
        path: ['root', 'children', '1', 'children', '0'],
      },
    ],
  },
]);

testRule('wsdl-port-address', [
  { name: 'SOAP 1.1 and 1.2 addresses', document: wsdlDoc(valid), errors: [] },
  {
    name: 'http:address for an HTTP binding',
    document: definitions(
      `<wsdl:binding name="B" type="tns:P" xmlns:http="http://schemas.xmlsoap.org/wsdl/http/"><http:binding verb="GET"/></wsdl:binding>
<wsdl:service name="S" xmlns:http="http://schemas.xmlsoap.org/wsdl/http/"><wsdl:port name="P" binding="tns:B"><http:address location="https://example.com"/></wsdl:port></wsdl:service>`,
    ),
    errors: [],
  },
  {
    name: 'missing address and location',
    document: definitions(
      `<wsdl:service name="S">
<wsdl:port name="A" binding="tns:B"/>
<wsdl:port name="C" binding="tns:B"><soap:address location=" "/></wsdl:port>
</wsdl:service>`,
    ),
    errors: [
      {
        message: 'Port "A" must have a soap:address or soap12:address.',
        path: ['root', 'children', '0', 'children', '0', 'attributes', 'name', 'value'],
        range: range(2, 17, 18),
      },
      {
        message: 'The address of port "C" must have a "location".',
        path: ['root', 'children', '0', 'children', '1', 'children', '0', 'attributes', 'location', 'value'],
      },
    ],
  },
]);

testRule('wsdl-names-unique', [
  { name: 'unique names', document: wsdlDoc(valid), errors: [] },
  {
    name: 'duplicate names',
    document: definitions(
      `<wsdl:message name="M"><wsdl:part name="p"/><wsdl:part name="p"/></wsdl:message>
<wsdl:message name="M"/>
<wsdl:portType name="P"><wsdl:operation name="O"/><wsdl:operation name="O"/></wsdl:portType>
<wsdl:portType name="P"/>
<wsdl:binding name="B"/>
<wsdl:binding name="B"/>
<wsdl:service name="S"><wsdl:port name="X"/></wsdl:service>
<wsdl:service name="S"><wsdl:port name="X"/></wsdl:service>`,
    ),
    errors: [
      { message: 'Part "p" is already defined in message "M".' },
      {
        message: 'Message "M" is already defined.',
        path: ['root', 'children', '1', 'attributes', 'name', 'value'],
        range: range(2, 20, 21),
      },
      { message: 'Operation "O" is already defined in port type "P".' },
      { message: 'Port type "P" is already defined.' },
      { message: 'Binding "B" is already defined.' },
      { message: 'Service "S" is already defined.' },
      { message: 'Port "X" is already defined.' },
    ],
  },
]);

testRule('wsdl-names-pascal-case', [
  { name: 'PascalCase names', document: wsdlDoc(valid), errors: [] },
  {
    name: 'other casing',
    document: definitions(
      `<wsdl:portType name="petPortType"/>
<wsdl:binding name="Pet_Binding" type="tns:petPortType"/>
<wsdl:service name="pet-service"/>
<wsdl:message name="lowercaseMessagesAreFine"/>`,
    ),
    errors: [
      { message: 'Name "petPortType" must be PascalCase.' },
      { message: 'Name "Pet_Binding" must be PascalCase.' },
      {
        message: 'Name "pet-service" must be PascalCase.',
        path: ['root', 'children', '2', 'attributes', 'name', 'value'],
        range: range(3, 20, 31),
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

testRule('wsdl-documentation', [
  { name: 'documented', document: wsdlDoc(valid), errors: [] },
  {
    name: 'undocumented service and port type',
    document: definitions(
      `<wsdl:portType name="P"><wsdl:documentation> </wsdl:documentation></wsdl:portType>
<wsdl:service name="S"/>`,
    ),
    errors: [
      { message: 'Port type "P" must have a wsdl:documentation element.' },
      {
        message: 'Service "S" must have a wsdl:documentation element.',
        path: ['root', 'children', '1', 'attributes', 'name', 'value'],
        range: range(2, 20, 21),
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
]);

testRule('wsdl-operation-documentation', [
  { name: 'documented', document: wsdlDoc(valid), errors: [] },
  {
    name: 'undocumented operation',
    document: definitions('<wsdl:portType name="P"><wsdl:operation name="O"/></wsdl:portType>'),
    errors: [
      {
        message: 'Operation "O" must have a wsdl:documentation element.',
        path: ['root', 'children', '0', 'children', '0', 'attributes', 'name', 'value'],
        range: range(1, 46, 47),
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
]);

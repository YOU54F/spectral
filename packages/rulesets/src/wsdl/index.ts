import { wsdl } from '@stoplight/spectral-formats';
import { pattern } from '@stoplight/spectral-functions';

import wsdlBindingComplete from './functions/wsdlBindingComplete';
import wsdlBindingPortType from './functions/wsdlBindingPortType';
import wsdlBindingStyle from './functions/wsdlBindingStyle';
import wsdlDocumentation from './functions/wsdlDocumentation';
import wsdlNamesUnique from './functions/wsdlNamesUnique';
import wsdlOperationMessages from './functions/wsdlOperationMessages';
import wsdlPartReferences from './functions/wsdlPartReferences';
import wsdlPortAddress from './functions/wsdlPortAddress';
import wsdlPortBinding from './functions/wsdlPortBinding';
import wsdlSoapBinding from './functions/wsdlSoapBinding';
import wsdlSoapUse from './functions/wsdlSoapUse';
import { Wsdl } from './parser';

const WSDL_NS = 'http://schemas.xmlsoap.org/wsdl/';
const wsdlChild = (localName: string): string => `@.namespace === '${WSDL_NS}' && @.localName === '${localName}'`;
const SERVICES = `$.root.children[?(${wsdlChild('service')})]`;
const PORT_TYPES = `$.root.children[?(${wsdlChild('portType')})]`;
const BINDINGS = `$.root.children[?(${wsdlChild('binding')})]`;
const OPERATIONS = `${PORT_TYPES}.children[?(${wsdlChild('operation')})]`;

// Files that do not end in .wsdl or .xsd are only parsed as XML when they look like WSDL 1.1 or XML Schema,
// so JSON and YAML never match. XML Schema matters for imports from URLs such as "service?xsd=1".
const WSDL_SNIFF =
  /<(?:[\w.-]+:)?definitions\b[^>]*\sxmlns(?::[\w.-]+)?\s*=\s*["']http:\/\/schemas\.xmlsoap\.org\/wsdl\/["']/;
const XSD_SNIFF =
  /<(?:[\w.-]+:)?schema\b[^>]*\sxmlns(?::[\w.-]+)?\s*=\s*["']http:\/\/www\.w3\.org\/2001\/XMLSchema["']/;
const looksLikeWsdl = (input: string): boolean =>
  /^﻿?\s*</.test(input) && [WSDL_SNIFF, XSD_SNIFF].some(sniff => sniff.test(input.slice(0, 65536)));

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/wsdl-rules.md',
  formats: [wsdl],
  parsers: [{ parser: Wsdl, extensions: ['.wsdl', '.xsd'], test: looksLikeWsdl }],
  rules: {
    'wsdl-message-part-reference': {
      description:
        'Message parts must have an "element" or a "type" whose prefix is bound, and which is defined when it is in the target namespace of the document or of an inline or imported schema.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlPartReferences,
      },
    },
    'wsdl-operation-message-reference': {
      description: 'Port type operation inputs, outputs and faults must refer to a defined message.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlOperationMessages,
      },
    },
    'wsdl-binding-port-type-reference': {
      description: 'Bindings must refer to a defined port type.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlBindingPortType,
        functionOptions: {
          check: 'type',
        },
      },
    },
    'wsdl-binding-operation-reference': {
      description: 'Binding operations must be operations of the port type of the binding.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlBindingPortType,
        functionOptions: {
          check: 'operations',
        },
      },
    },
    'wsdl-port-binding-reference': {
      description: 'Service ports must refer to a defined binding.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlPortBinding,
      },
    },
    'wsdl-binding-operations-complete': {
      description: 'Every operation of a port type must be bound by each binding of that port type.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlBindingComplete,
      },
    },
    'wsdl-no-encoded-use': {
      description: 'SOAP bodies, headers and faults must use "literal", not "encoded" (WS-I Basic Profile R2706).',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlSoapUse,
      },
    },
    'wsdl-document-literal-style': {
      description: 'Prefer the document style over the rpc style for SOAP bindings and operations.',
      message: '{{error}}',
      severity: 'warn',
      given: '$',
      then: {
        function: wsdlBindingStyle,
        functionOptions: {
          check: 'rpc',
        },
      },
    },
    'wsdl-binding-style-consistent': {
      description: 'All operations of a SOAP binding must have the same style (WS-I Basic Profile R2705).',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlBindingStyle,
        functionOptions: {
          check: 'consistent',
        },
      },
    },
    'wsdl-soap-binding-transport': {
      description: 'Bindings must have a soap:binding or soap12:binding with a transport.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlSoapBinding,
      },
    },
    'wsdl-port-address': {
      description: 'Service ports must have a soap:address or soap12:address with a location.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlPortAddress,
      },
    },
    'wsdl-names-unique': {
      description:
        'Messages, port types, bindings, services and ports must have unique names, as must operations within a port type and parts within a message.',
      message: '{{error}}',
      severity: 'error',
      given: '$',
      then: {
        function: wsdlNamesUnique,
      },
    },
    'wsdl-names-pascal-case': {
      description: 'Service, port type and binding names must be PascalCase.',
      message: 'Name "{{value}}" must be PascalCase.',
      severity: 'warn',
      given: [SERVICES, PORT_TYPES, BINDINGS].map(given => `${given}.attributes.name.value`),
      then: {
        function: pattern,
        functionOptions: {
          match: '^[A-Z][A-Za-z0-9]*$',
        },
      },
    },
    'wsdl-documentation': {
      description: 'Services and port types must have a wsdl:documentation element.',
      message: '{{error}}',
      severity: 'warn',
      given: [SERVICES, PORT_TYPES],
      then: {
        function: wsdlDocumentation,
      },
    },
    'wsdl-operation-documentation': {
      description: 'Port type operations should have a wsdl:documentation element.',
      message: '{{error}}',
      severity: 'info',
      given: OPERATIONS,
      then: {
        function: wsdlDocumentation,
      },
    },
  },
};

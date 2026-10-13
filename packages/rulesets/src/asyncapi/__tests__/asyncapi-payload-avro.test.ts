import { DiagnosticSeverity } from '@stoplight/types';
import produce from 'immer';
import testRule from './__helpers__/tester';

const avroPayload = {
  type: 'record',
  name: 'UserSignedUp',
  namespace: 'com.example',
  fields: [
    { name: 'userId', type: 'string' },
    { name: 'email', type: ['null', 'string'], default: null },
    { name: 'createdAt', type: { type: 'long', logicalType: 'timestamp-millis' } },
  ],
};

const invalidAvroPayload = {
  type: 'record',
  name: '1UserSignedUp',
  fields: [
    { name: 'userId', type: 'string', default: 1 },
    { name: 'address', type: 'com.example.Address' },
    { name: 'tags', type: ['null', 'string', 'string'] },
  ],
};

const document = {
  asyncapi: '2.6.0',
  info: { title: 'Signup', version: '1.0.0' },
  channels: {
    'users/signedUp': {
      publish: {
        message: {
          schemaFormat: 'application/vnd.apache.avro;version=1.9.0',
          payload: avroPayload,
        },
      },
    },
  },
  components: {
    messageTraits: {
      aTrait: {
        schemaFormat: 'application/vnd.apache.avro+yaml;version=1.9.0',
      },
    },
    messages: {
      aMessage: {
        schemaFormat: 'application/vnd.apache.avro+json;version=1.8.2',
        payload: avroPayload,
      },
      jsonSchemaMessage: {
        payload: { type: 'object', properties: { name: { type: 'integer' } } },
      },
      otherFormatMessage: {
        schemaFormat: 'application/raml+yaml;version=1.0',
        payload: { type: 'string' },
      },
    },
  },
};

testRule('asyncapi-payload-avro', [
  {
    name: 'valid Avro payloads',
    document,
    errors: [],
  },
  {
    name: 'primitive Avro payload',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload = 'string';
    }),
    errors: [],
  },
  {
    name: 'invalid Avro payload in components.messages',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload = invalidAvroPayload;
    }),
    errors: [
      {
        message:
          'Name "1UserSignedUp" of record is not a valid Avro name. Each part must match [A-Za-z_][A-Za-z0-9_]*.',
        path: ['components', 'messages', 'aMessage', 'payload', 'name'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Default value of field "userId" does not match its type (string).',
        path: ['components', 'messages', 'aMessage', 'payload', 'fields', '0', 'default'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Type "com.example.Address" is not defined.',
        path: ['components', 'messages', 'aMessage', 'payload', 'fields', '1', 'type'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Union contains more than one "string" schema.',
        path: ['components', 'messages', 'aMessage', 'payload', 'fields', '2', 'type', '2'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'invalid Avro payload in a channel message',
    document: produce(document, (draft: any) => {
      draft.channels['users/signedUp'].publish.message.payload = {
        type: 'enum',
        name: 'Status',
        symbols: ['ACTIVE', 'ACTIVE'],
      };
    }),
    errors: [
      {
        message: 'Enum symbol "ACTIVE" is duplicated in enum "Status".',
        path: ['channels', 'users/signedUp', 'publish', 'message', 'payload', 'symbols', '1'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'structurally invalid Avro payload',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload = { type: 'record', name: 'Broken' };
    }),
    errors: [
      {
        message: 'must have required property "fields"',
        path: ['components', 'messages', 'aMessage', 'payload'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'payloads without an Avro schemaFormat are ignored',
    document: produce(document, (draft: any) => {
      draft.components.messages.jsonSchemaMessage.payload = invalidAvroPayload;
      draft.components.messages.otherFormatMessage.payload = invalidAvroPayload;
    }),
    errors: [],
  },
]);

import { DiagnosticSeverity } from '@stoplight/types';
import produce from 'immer';
import testRule from './__helpers__/tester';

const avroPayload = {
  schemaFormat: 'application/vnd.apache.avro;version=1.9.0',
  schema: {
    type: 'record',
    name: 'UserSignedUp',
    namespace: 'com.example',
    fields: [
      { name: 'userId', type: 'string' },
      { name: 'email', type: ['null', 'string'], default: null },
      { name: 'amount', type: { type: 'bytes', logicalType: 'decimal', precision: 9, scale: 2 } },
    ],
  },
};

const document = {
  asyncapi: '3.0.0',
  info: { title: 'Signup', version: '1.0.0' },
  channels: {
    userSignedUp: {
      address: 'users/signedUp',
      messages: {
        signedUp: { payload: avroPayload },
      },
    },
  },
  components: {
    messages: {
      aMessage: {
        payload: {
          schemaFormat: 'application/vnd.apache.avro+yaml;version=1.9.0',
          schema: avroPayload.schema,
        },
      },
      jsonSchemaMessage: {
        payload: { type: 'object', properties: { name: { type: 'integer' } } },
      },
      otherFormatMessage: {
        payload: {
          schemaFormat: 'application/raml+yaml;version=1.0',
          schema: { type: 'string' },
        },
      },
    },
  },
};

testRule('asyncapi-3-payload-avro', [
  {
    name: 'valid Avro payloads',
    document,
    errors: [],
  },
  {
    name: 'invalid Avro payload in components.messages',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload.schema = {
        type: 'record',
        name: 'UserSignedUp',
        fields: [
          { name: 'userId', type: 'string' },
          { name: 'userId', type: 'int' },
          { name: 'amount', type: { type: 'bytes', logicalType: 'decimal', precision: 2, scale: 5 } },
        ],
      };
    }),
    errors: [
      {
        message: 'Field "userId" is already defined in record "UserSignedUp".',
        path: ['components', 'messages', 'aMessage', 'payload', 'schema', 'fields', '1', 'name'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'invalid Avro payload in a channel message',
    document: produce(document, (draft: any) => {
      draft.channels.userSignedUp.messages.signedUp.payload = {
        schemaFormat: 'application/vnd.apache.avro+json;version=1.8.2',
        schema: { type: 'map' },
      };
    }),
    errors: [
      {
        message: 'must have required property "values"',
        path: ['channels', 'userSignedUp', 'messages', 'signedUp', 'payload', 'schema'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
  {
    name: 'payloads without an Avro schemaFormat are ignored',
    document: produce(document, (draft: any) => {
      draft.components.messages.otherFormatMessage.payload.schema = { type: 'record', name: '1Bad' };
    }),
    errors: [],
  },
]);

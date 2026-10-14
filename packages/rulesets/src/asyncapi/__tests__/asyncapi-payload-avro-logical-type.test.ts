import { DiagnosticSeverity } from '@stoplight/types';
import produce from 'immer';
import testRule from './__helpers__/tester';

const avroPayload = {
  type: 'record',
  name: 'UserSignedUp',
  namespace: 'com.example',
  fields: [
    { name: 'userId', type: 'string' },
    { name: 'createdAt', type: { type: 'long', logicalType: 'timestamp-millis' } },
    { name: 'amount', type: { type: 'bytes', logicalType: 'decimal', precision: 9, scale: 2 } },
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
    messages: {
      aMessage: {
        schemaFormat: 'application/vnd.apache.avro+json;version=1.8.2',
        payload: avroPayload,
      },
      jsonSchemaMessage: {
        payload: { type: 'object', properties: { name: { type: 'integer' } } },
      },
    },
  },
};

testRule('asyncapi-payload-avro-logical-type', [
  {
    name: 'valid logical types',
    document,
    errors: [],
  },
  {
    name: 'invalid decimal in components.messages',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload.fields[2].type.scale = 12;
    }),
    errors: [
      {
        message:
          'Logical type "decimal" "scale" (12) must not be greater than "precision" (9); Avro implementations will ignore it.',
        path: ['components', 'messages', 'aMessage', 'payload', 'fields', '2', 'type', 'logicalType'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'logical type on the field in a channel message',
    document: produce(document, (draft: any) => {
      draft.channels['users/signedUp'].publish.message.payload.fields[1] = {
        name: 'createdAt',
        type: 'long',
        logicalType: 'timestamp-millis',
      };
    }),
    errors: [
      {
        message:
          'Logical type "timestamp-millis" is set on the field rather than on its type, so it is ignored. Use "type": { "type": "long", "logicalType": "timestamp-millis" } instead.',
        path: ['channels', 'users/signedUp', 'publish', 'message', 'payload', 'fields', '1', 'logicalType'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'structural problems are left to asyncapi-payload-avro',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload.name = '1UserSignedUp';
    }),
    errors: [],
  },
  {
    name: 'payloads without an Avro schemaFormat are ignored',
    document: produce(document, (draft: any) => {
      draft.components.messages.jsonSchemaMessage.payload = {
        type: 'record',
        name: 'Amount',
        fields: [{ name: 'amount', type: { type: 'bytes', logicalType: 'decimal', precision: 2, scale: 5 } }],
      };
    }),
    errors: [],
  },
]);

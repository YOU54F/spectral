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
      { name: 'createdAt', type: { type: 'long', logicalType: 'timestamp-millis' } },
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
      otherFormatMessage: {
        payload: {
          schemaFormat: 'application/raml+yaml;version=1.0',
          schema: { type: 'string' },
        },
      },
    },
  },
};

testRule('asyncapi-3-payload-avro-logical-type', [
  {
    name: 'valid logical types',
    document,
    errors: [],
  },
  {
    name: 'invalid decimal in components.messages',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload.schema.fields[2].type = {
        type: 'bytes',
        logicalType: 'decimal',
        precision: 2,
        scale: 5,
      };
    }),
    errors: [
      {
        message:
          'Logical type "decimal" "scale" (5) must not be greater than "precision" (2); Avro implementations will ignore it.',
        path: ['components', 'messages', 'aMessage', 'payload', 'schema', 'fields', '2', 'type', 'logicalType'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'logical type on the field in a channel message',
    document: produce(document, (draft: any) => {
      draft.channels.userSignedUp.messages.signedUp.payload.schema.fields[1] = {
        name: 'createdAt',
        type: 'long',
        logicalType: 'timestamp-millis',
      };
    }),
    errors: [
      {
        message:
          'Logical type "timestamp-millis" is set on the field rather than on its type, so it is ignored. Use "type": { "type": "long", "logicalType": "timestamp-millis" } instead.',
        path: ['channels', 'userSignedUp', 'messages', 'signedUp', 'payload', 'schema', 'fields', '1', 'logicalType'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'structural problems are left to asyncapi-3-payload-avro',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload.schema = { type: 'map' };
    }),
    errors: [],
  },
  {
    name: 'payloads without an Avro schemaFormat are ignored',
    document: produce(document, (draft: any) => {
      draft.components.messages.otherFormatMessage.payload.schema = {
        type: 'record',
        name: 'Amount',
        fields: [{ name: 'amount', type: { type: 'bytes', logicalType: 'decimal', precision: 2, scale: 5 } }],
      };
    }),
    errors: [],
  },
]);

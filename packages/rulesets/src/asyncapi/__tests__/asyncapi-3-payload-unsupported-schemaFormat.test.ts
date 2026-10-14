import { DiagnosticSeverity } from '@stoplight/types';
import produce from 'immer';
import testRule from './__helpers__/tester';

const document = {
  asyncapi: '3.0.0',
  channels: {
    SomeChannel: {
      address: 'users/{userId}/signedUp',
      messages: {
        SomeMessage: { payload: {} },
      },
    },
  },
  components: {
    messages: {
      aMessage: { payload: {} },
    },
  },
};

testRule('asyncapi-3-payload-unsupported-schemaFormat', [
  {
    name: 'valid case',
    document,
    errors: [],
  },
  {
    name: 'schemaFormat is set to Avro',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload = {
        schemaFormat: 'application/vnd.apache.avro;version=1.9.0',
        schema: 'string',
      };
      draft.channels.SomeChannel.messages.SomeMessage.payload = {
        schemaFormat: 'application/vnd.apache.avro+yaml;version=1.9.0',
        schema: 'string',
      };
    }),
    errors: [],
  },
  {
    name: 'components.messages.{message}.schemaFormat is set to a non supported value',
    document: produce(document, (draft: any) => {
      draft.components.messages.aMessage.payload.schemaFormat = 'application/nope';
    }),
    errors: [
      {
        message: 'Message schema validation is only supported with default unspecified "schemaFormat" or Avro.',
        path: ['components', 'messages', 'aMessage', 'payload', 'schemaFormat'],
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
  {
    name: `channels.SomeChannel.messages.SomeMessage.schemaFormat is set to a non supported value`,
    document: produce(document, (draft: any) => {
      draft.channels.SomeChannel.messages.SomeMessage.payload.schemaFormat = 'application/nope';
    }),
    errors: [
      {
        message: 'Message schema validation is only supported with default unspecified "schemaFormat" or Avro.',
        path: ['channels', 'SomeChannel', 'messages', 'SomeMessage', 'payload', 'schemaFormat'],
        severity: DiagnosticSeverity.Information,
      },
    ],
  },
]);

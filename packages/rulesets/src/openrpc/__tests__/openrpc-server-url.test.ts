import { DiagnosticSeverity } from '@stoplight/types';
import testRule from './__helpers__/tester';
import { createDocument, modifyDocument } from './__helpers__/document';

testRule('openrpc-server-url', [
  {
    name: 'valid templated url',
    document: createDocument(),
    errors: [],
  },
  {
    name: 'relative urls are allowed',
    document: modifyDocument(doc => {
      doc.servers = [{ url: '/rpc' }, { url: 'rpc' }];
      doc.methods[0].servers = [{ url: 'ws://localhost:8545' }];
    }),
    errors: [],
  },
  {
    name: 'undefined variable',
    document: modifyDocument(doc => {
      doc.servers[0].url = 'https://{region}.petstore.example:{port}/rpc';
    }),
    errors: [
      {
        message: 'Server variable "port" is used in "url" but not defined in "variables".',
        path: ['servers', '0', 'url'],
        severity: DiagnosticSeverity.Warning,
      },
    ],
  },
  {
    name: 'unused variable and default outside enum',
    document: modifyDocument(doc => {
      doc.servers[0].url = 'https://petstore.example/rpc';
      doc.servers[0].variables.region.default = 'asia';
    }),
    errors: [
      {
        message: 'Server variable "region" is defined but not used in "url".',
        path: ['servers', '0', 'variables', 'region'],
      },
      {
        message: 'Default value "asia" of server variable "region" must be one of its "enum" values.',
        path: ['servers', '0', 'variables', 'region', 'default'],
      },
    ],
  },
  {
    name: 'malformed url in a method server',
    document: modifyDocument(doc => {
      doc.methods[0].servers = [{ url: 'https://pet store.example/rpc' }];
    }),
    errors: [
      {
        message:
          'Server "url" must be a valid URL (relative URLs and {variables} are allowed), got "https://pet store.example/rpc".',
        path: ['methods', '0', 'servers', '0', 'url'],
      },
    ],
  },
]);

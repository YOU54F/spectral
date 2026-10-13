import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

testRule('mcp-urls-https', [
  {
    name: 'no website or icons',
    document: validServer,
    errors: [],
  },
  {
    name: 'https website and icons',
    document: server({
      websiteUrl: 'https://weather.example.com/docs',
      icons: [{ src: 'https://weather.example.com/icon.png', mimeType: 'image/png' }],
    }),
    errors: [],
  },
  {
    name: 'http website and relative icon',
    document: server({
      websiteUrl: 'http://weather.example.com',
      icons: [{ src: '/icon.png' }, { src: 'https://weather.example.com/icon".png' }],
    }),
    errors: [
      {
        message: '"http://weather.example.com" must be an absolute https URL.',
        path: ['websiteUrl'],
        severity: DiagnosticSeverity.Error,
      },
      {
        message: '"/icon.png" must be an absolute https URL.',
        path: ['icons', '0', 'src'],
      },
      {
        message: '"https://weather.example.com/icon".png" must be an absolute https URL.',
        path: ['icons', '1', 'src'],
      },
    ],
  },
]);

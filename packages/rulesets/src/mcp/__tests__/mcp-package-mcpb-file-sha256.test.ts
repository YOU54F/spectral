import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { server, validServer } from './__helpers__/tester';

const mcpbPackage = {
  registryType: 'mcpb',
  identifier: 'https://github.com/example/weather/releases/download/v1.0.0/weather.mcpb',
  version: '1.0.0',
  transport: { type: 'stdio' },
};

testRule('mcp-package-mcpb-file-sha256', [
  {
    name: 'non-MCPB package without fileSha256',
    document: validServer,
    errors: [],
  },
  {
    name: 'MCPB package with fileSha256',
    document: server({ packages: [{ ...mcpbPackage, fileSha256: 'f'.repeat(64) }] }),
    errors: [],
  },
  {
    name: 'MCPB package without fileSha256',
    document: server({ packages: [mcpbPackage] }),
    errors: [
      {
        message: 'MCPB package must specify "fileSha256" so clients can verify the downloaded file.',
        path: ['packages', '0'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

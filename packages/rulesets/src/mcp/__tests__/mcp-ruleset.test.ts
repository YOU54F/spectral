import { DiagnosticSeverity } from '@stoplight/types';
import { Spectral } from '@stoplight/spectral-core';
import mcpRuleset from '../index';
import { validServer } from './__helpers__/tester';

describe('MCP ruleset', () => {
  const spectral = new Spectral();
  spectral.setRuleset(mcpRuleset);

  it('reports nothing for a valid server.json', async () => {
    expect(await spectral.run(JSON.stringify(validServer))).toEqual([]);
  });

  it('does not run against non-MCP documents', async () => {
    const results = await spectral.run(JSON.stringify({ openapi: '3.1.0', info: { title: 'x', version: 'latest' } }));
    expect(results.filter(({ code }) => String(code).startsWith('mcp-'))).toEqual([]);
  });

  it('reports multiple problems', async () => {
    const results = await spectral.run(
      JSON.stringify({
        ...validServer,
        name: 'weather',
        version: 'latest',
        remotes: [{ type: 'sse', url: 'http://localhost:3000/sse' }],
      }),
    );

    expect(results.map(({ code, severity }) => [code, severity])).toEqual(
      expect.arrayContaining([
        ['mcp-server-schema', DiagnosticSeverity.Error],
        ['mcp-version-not-latest', DiagnosticSeverity.Error],
        ['mcp-remote-url', DiagnosticSeverity.Error],
      ]),
    );
  });
});

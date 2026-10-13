import { mcpServer } from '../mcp';

describe('MCP server.json format', () => {
  it.each([
    'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
    'https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json',
    'https://static.modelcontextprotocol.io/schemas/draft/server.schema.json',
  ])('recognizes document with $schema %s', $schema => {
    expect(mcpServer({ $schema, name: 'io.github.user/weather' }, null)).toBe(true);
  });

  it.each([
    { name: 'io.github.user/weather', version: '1.0.0', packages: [] },
    { name: 'com.example/server', version: '1.0.0', remotes: [] },
  ])('recognizes document without $schema using heuristics %o', document => {
    expect(mcpServer(document, null)).toBe(true);
  });

  it.each([
    { $schema: 'http://json-schema.org/draft-07/schema#', name: 'io.github.user/weather', packages: [] },
    { $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/other.schema.json' },
    { $schema: 'https://example.com/schemas/2025-12-11/server.schema.json' },
    { name: 'weather', version: '1.0.0', packages: [] },
    { name: 'io.github.user/weather', version: '1.0.0' },
    { name: 'io.github.user/weather', packages: [] },
    { openapi: '3.1.0' },
    {},
    null,
    'io.github.user/weather',
  ])('does not recognize %o', document => {
    expect(mcpServer(document, null)).toBe(false);
  });
});

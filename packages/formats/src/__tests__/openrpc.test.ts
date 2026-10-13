import { openrpc1 } from '../openrpc';

describe('OpenRPC format', () => {
  describe('OpenRPC 1.x', () => {
    it.each(['1.0.0', '1.0.0-rc0', '1.0.0-rc1', '1.2.6', '1.3.0', '1.3.2', '1.4.0', '1.4.1', '1.4.99'])(
      'recognizes %s version correctly',
      version => {
        expect(openrpc1({ openrpc: version }, null)).toBe(true);
      },
    );

    const testCases = [
      { openrpc: '0.1.0' },
      { openrpc: '1' },
      { openrpc: '1.3' },
      { openrpc: '1.3.' },
      { openrpc: '2.0.0' },
      { openrpc: '1.3.0-beta' },
      { openrpc: 1.3 },
      { openrpc: null },
      { jsonrpc: '2.0' },
      { openapi: '3.1.0' },
      {},
      null,
      [],
    ];

    it.each(testCases)('does not recognize invalid document %o', document => {
      expect(openrpc1(document, null)).toBe(false);
    });
  });
});

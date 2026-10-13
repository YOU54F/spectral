import { Document } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import openrpcRuleset from '../index';
import { createWithRules } from './__helpers__/tester';
import { createDocument } from './__helpers__/document';

const ruleNames = Object.keys(openrpcRuleset.rules) as Array<keyof typeof openrpcRuleset.rules>;

describe('spectral:openrpc ruleset', () => {
  it.each(['1.0.0-rc1', '1.2.6', '1.3.2', '1.4.1'])(
    'reports nothing for a valid OpenRPC %s document',
    async version => {
      const s = createWithRules(ruleNames);
      const results = await s.run(JSON.stringify(createDocument(version)));
      expect(results).toEqual([]);
    },
  );

  it('does not apply to non-OpenRPC documents', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(
      new Document(JSON.stringify({ jsonrpc: '2.0', methods: [{ name: 'rpc.foo' }] }), Parsers.Json),
    );
    expect(results.filter(r => r.code.toString().startsWith('openrpc-'))).toEqual([]);
  });

  it('every rule is documented', () => {
    for (const rule of Object.values(openrpcRuleset.rules)) {
      expect(rule.description).toEqual(expect.any(String));
    }
  });
});

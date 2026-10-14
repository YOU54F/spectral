import { Document } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import protobufRuleset from '../index';
import { createWithRules, proto } from './__helpers__/tester';
import { valid } from './__helpers__/valid';

const ruleNames = Object.keys(protobufRuleset.rules) as Array<keyof typeof protobufRuleset.rules>;

describe('spectral:protobuf ruleset', () => {
  it('reports nothing for a valid file', async () => {
    const s = createWithRules(ruleNames);
    expect(await s.run(proto(valid))).toEqual([]);
  });

  it('does not apply to non-Protobuf documents', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(
      new Document(JSON.stringify({ openapi: '3.1.0', messages: [{ name: 'x' }] }), Parsers.Json),
    );
    expect(results.filter(r => r.code.toString().startsWith('protobuf-'))).toEqual([]);
  });

  it('registers the Protobuf parser for .proto files', () => {
    expect(protobufRuleset.parsers).toEqual([{ parser: Parsers.Protobuf, extensions: ['.proto'] }]);
  });

  it('surfaces syntax errors', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(proto('syntax = "proto3";\npackage a;\nmessage A { string a = ; }\n'));
    expect(results).toEqual([
      expect.objectContaining({ code: 'protobuf-comments' }),
      expect.objectContaining({
        code: 'parser',
        message: 'Expected integer but found ";"',
        range: { start: { line: 2, character: 23 }, end: { line: 2, character: 24 } },
      }),
    ]);
  });

  it('every rule is documented', () => {
    for (const rule of Object.values(protobufRuleset.rules)) {
      expect(rule.description).toEqual(expect.any(String));
    }
  });
});

import * as path from '@stoplight/path';
import { truthy } from '@stoplight/spectral-functions';
import * as Parsers from '@stoplight/spectral-parsers';
import * as fs from 'fs';
import { Ruleset } from '../ruleset';
import { Spectral } from '../spectral';
import { KeyValue } from './__fixtures__/parsers/kv-parser';

const fixtures = path.join(__dirname, '__fixtures__/parsers');

const rules = {
  'port-defined': {
    given: '$..port',
    then: { function: truthy },
  },
};

describe('Spectral parsers', () => {
  it('uses YAML when no parser matches', () => {
    const spectral = new Spectral();

    expect(spectral.createDocument('a: b', '/a.kv').data).toEqual({ a: 'b' });
  });

  it('picks the parser registered for the extension in the ruleset', async () => {
    const spectral = new Spectral();
    spectral.setRuleset(new Ruleset({ parsers: [{ parser: KeyValue, extensions: ['.kv'] }], rules }));

    const document = spectral.createDocument('name=petstore\nport=\n', '/config.kv');

    expect(document.data).toEqual({ name: 'petstore', port: '' });
    expect(await spectral.run(document)).toEqual([
      expect.objectContaining({
        code: 'port-defined',
        path: ['port'],
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
      }),
    ]);
  });

  it('sniffs the content of a string target', async () => {
    const spectral = new Spectral({
      parsers: [{ parser: KeyValue, test: input => /^\w+=/.test(input) }],
    });
    spectral.setRuleset(new Ruleset({ rules }));

    expect(await spectral.run('name=petstore\nport=\n')).toEqual([
      expect.objectContaining({ code: 'port-defined', path: ['port'] }),
    ]);
  });

  it('gives parsers passed to the constructor precedence over the ruleset ones', () => {
    const spectral = new Spectral({ parsers: [{ parser: KeyValue, extensions: ['.kv'] }] });
    spectral.setRuleset(new Ruleset({ parsers: [{ parser: Parsers.Json, extensions: ['.kv'] }], rules }));

    expect(spectral.createDocument('a=b', '/a.kv').data).toEqual({ a: 'b' });
  });

  it('parses $ref targets with the registered parser', async () => {
    const source = path.join(fixtures, 'document.json');
    const spectral = new Spectral();
    spectral.setRuleset(new Ruleset({ parsers: [{ parser: KeyValue, extensions: ['.kv'] }], rules }));

    const results = await spectral.run(spectral.createDocument(fs.readFileSync(source, 'utf8'), source));

    expect(results).toEqual([
      expect.objectContaining({
        code: 'port-defined',
        path: ['port'],
        source: path.join(fixtures, 'config.kv'),
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
      }),
    ]);
  });
});

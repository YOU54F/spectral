import * as path from '@stoplight/path';
import { truthy } from '@stoplight/spectral-functions';
import * as Parsers from '@stoplight/spectral-parsers';
import * as fs from 'fs';
import { Format, Ruleset } from '../ruleset';
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
  describe('formats', () => {
    const kv: Format = (_document, _source, context) => context?.parser === KeyValue;
    kv.displayName = 'KV';

    const ruleset = (): Ruleset =>
      new Ruleset({
        parsers: [{ parser: KeyValue, extensions: ['.kv'] }],
        formats: [kv],
        rules: { 'port-defined': { ...rules['port-defined'], formats: [kv] } },
      });

    it('passes the parser that produced the document to formats', async () => {
      const spectral = new Spectral();
      spectral.setRuleset(ruleset());

      const document = spectral.createDocument('name=petstore\nport=\n', '/config.kv');

      expect(await spectral.run(document)).toEqual([expect.objectContaining({ code: 'port-defined' })]);
      expect(document.formats).toEqual(new Set([kv]));
    });

    it('does not match documents produced by other parsers', async () => {
      const spectral = new Spectral();
      spectral.setRuleset(ruleset());

      expect(await spectral.run(spectral.createDocument('port: ""', '/config.yaml'))).toEqual([
        expect.objectContaining({ code: 'unrecognized-format' }),
      ]);
    });

    it('passes null when the parser is not known', async () => {
      const format = jest.fn().mockReturnValue(true);
      const spectral = new Spectral();
      spectral.setRuleset(new Ruleset({ formats: [format], rules }));

      await spectral.run({ port: '' });
      expect(format).toHaveBeenLastCalledWith({ port: '' }, null, { parser: Parsers.Yaml });

      await spectral.run({
        parsed: Parsers.parseYaml('port: ""'),
        getLocationForJsonPath: Parsers.Yaml.getLocationForJsonPath,
      });
      expect(format).toHaveBeenLastCalledWith({ port: '' }, null, { parser: null });
    });
  });
});

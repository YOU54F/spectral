import { Json } from '../json';
import { Yaml } from '../yaml';
import { AnyParser, ParserRegistry } from '../registry';

const Custom: AnyParser = {
  parse: input => ({ data: { input }, ast: {}, lineMap: [], diagnostics: [] }),
  getLocationForJsonPath: () => void 0,
  trapAccess: obj => obj,
};

describe('ParserRegistry', () => {
  it('returns null when nothing matches', () => {
    const registry = new ParserRegistry([{ parser: Custom, extensions: ['.graphql'] }]);

    expect(registry.find('/schema.yaml', 'a: b')).toBeNull();
    expect(registry.find(null, 'a: b')).toBeNull();
  });

  it.each([
    '/api/schema.graphql',
    '/api/SCHEMA.GRAPHQL',
    'https://example.com/schema.graphql?ref=main',
    'https://example.com/schema.graphql#/definitions',
    'C:\\api\\schema.gql',
  ])('matches %s by extension', source => {
    const registry = new ParserRegistry([{ parser: Custom, extensions: ['.graphql', 'gql'] }]);

    expect(registry.find(source, '')).toBe(Custom);
  });

  it('matches compound extensions', () => {
    const registry = new ParserRegistry([{ parser: Custom, extensions: ['.schema.json'] }]);

    expect(registry.find('/a/b.schema.json', '{}')).toBe(Custom);
    expect(registry.find('/a/b.json', '{}')).toBeNull();
  });

  it('falls back to content sniffing', () => {
    const test = jest.fn((input: string) => input.startsWith('type '));
    const registry = new ParserRegistry([{ parser: Custom, test }]);

    expect(registry.find(null, 'type Query { a: Int }')).toBe(Custom);
    expect(registry.find('<STDIN>', 'a: b')).toBeNull();
    expect(test).toHaveBeenLastCalledWith('a: b', '<STDIN>');
  });

  it('prefers an extension match over a test match', () => {
    const registry = new ParserRegistry([
      { parser: Json, extensions: ['.json'] },
      { parser: Custom, test: () => true },
    ]);

    expect(registry.find('/a.json', '{}')).toBe(Json);
    expect(registry.find('/a.yaml', '{}')).toBe(Custom);
  });

  it('gives entries registered later precedence', () => {
    const registry = new ParserRegistry([{ parser: Json, extensions: ['.data'] }]).register({
      parser: Yaml,
      extensions: ['.data'],
    });

    expect(registry.find('/a.data', '')).toBe(Yaml);
    expect(registry.size).toBe(2);
  });

  it('is iterable, so registries can be combined', () => {
    const first = new ParserRegistry([{ parser: Json, extensions: ['.data'] }]);
    const second = new ParserRegistry([...first, { parser: Custom, extensions: ['.custom'] }]);

    expect([...second].map(({ parser }) => parser)).toEqual([Json, Custom]);
  });

  it('rejects entries without extensions or test', () => {
    expect(() => new ParserRegistry([{ parser: Custom }])).toThrow(TypeError);
    expect(() => new ParserRegistry([{ parser: Custom, extensions: [] }])).toThrow(TypeError);
  });
});

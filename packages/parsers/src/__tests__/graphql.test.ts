import { DiagnosticSeverity } from '@stoplight/types';
import { Graphql } from '../graphql';

const sdl = `"""
The query root
"""
type Query {
  pet(id: ID!): Pet
}

enum Status {
  AVAILABLE
  SOLD @deprecated(reason: "gone")
}
`;

describe('GraphQL Parser', () => {
  it('converts the SDL into plain objects', () => {
    const { data, diagnostics } = Graphql.parse(sdl);

    expect(diagnostics).toEqual([]);
    expect(data).toEqual({
      kind: 'Document',
      definitions: [
        {
          kind: 'ObjectTypeDefinition',
          description: 'The query root',
          name: 'Query',
          interfaces: [],
          directives: [],
          fields: [
            {
              kind: 'FieldDefinition',
              name: 'pet',
              arguments: [
                {
                  kind: 'InputValueDefinition',
                  name: 'id',
                  type: { kind: 'NonNullType', type: { kind: 'NamedType', name: 'ID' } },
                  directives: [],
                },
              ],
              type: { kind: 'NamedType', name: 'Pet' },
              directives: [],
            },
          ],
        },
        {
          kind: 'EnumTypeDefinition',
          name: 'Status',
          directives: [],
          values: [
            { kind: 'EnumValueDefinition', name: 'AVAILABLE', directives: [] },
            {
              kind: 'EnumValueDefinition',
              name: 'SOLD',
              directives: [
                {
                  kind: 'Directive',
                  name: 'deprecated',
                  arguments: [
                    { kind: 'Argument', name: 'reason', value: { kind: 'StringValue', value: 'gone', block: false } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('returns locations for JSON paths', () => {
    const result = Graphql.parse(sdl);

    expect(Graphql.getLocationForJsonPath(result, ['definitions', 0, 'name'])).toEqual({
      range: { start: { line: 3, character: 5 }, end: { line: 3, character: 10 } },
    });
    expect(Graphql.getLocationForJsonPath(result, ['definitions', 0, 'description'])).toEqual({
      range: { start: { line: 0, character: 0 }, end: { line: 2, character: 3 } },
    });
    expect(Graphql.getLocationForJsonPath(result, ['definitions', 1, 'values', 1])).toEqual({
      range: { start: { line: 9, character: 2 }, end: { line: 9, character: 34 } },
    });
  });

  it('walks up to the closest located ancestor only when asked to', () => {
    const result = Graphql.parse(sdl);
    const path = ['definitions', 0, 'fields', 0, 'description'];

    expect(Graphql.getLocationForJsonPath(result, path)).toBeUndefined();
    expect(Graphql.getLocationForJsonPath(result, path, true)).toEqual({
      range: { start: { line: 4, character: 2 }, end: { line: 4, character: 19 } },
    });
    expect(Graphql.getLocationForJsonPath(result, ['definitions', 0, 'name', 'foo'], true)).toEqual({
      range: { start: { line: 3, character: 5 }, end: { line: 3, character: 10 } },
    });
  });

  it('reports syntax errors as diagnostics', () => {
    const result = Graphql.parse('type Query {\n  pet: \n}\n');

    expect(result.data).toBeUndefined();
    expect(result.diagnostics).toEqual([
      {
        code: 'parse-error',
        message: 'Expected Name, found "}".',
        severity: DiagnosticSeverity.Error,
        range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
      },
    ]);
  });

  it('handles CRLF line endings', () => {
    const result = Graphql.parse('type A {\r\n  b: String\r\n}\r\n');

    expect(Graphql.getLocationForJsonPath(result, ['definitions', 0, 'fields', 0, 'name'])).toEqual({
      range: { start: { line: 1, character: 2 }, end: { line: 1, character: 3 } },
    });
  });
});

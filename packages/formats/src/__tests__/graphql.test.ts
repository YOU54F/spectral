import { graphql } from '../graphql';

describe('GraphQL format', () => {
  it('recognizes parsed GraphQL documents', () => {
    expect(graphql({ kind: 'Document', definitions: [] }, null)).toBe(true);
    expect(graphql({ kind: 'Document', definitions: [{ kind: 'ObjectTypeDefinition', name: 'Query' }] }, null)).toBe(
      true,
    );
  });

  it.each([{ kind: 'Document' }, { kind: 'Query', definitions: [] }, { openapi: '3.1.0' }, {}, null, [], 'Document'])(
    'does not recognize %o',
    document => {
      expect(graphql(document, null)).toBe(false);
    },
  );
});

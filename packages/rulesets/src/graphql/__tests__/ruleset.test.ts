import { Document } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import { Graphql } from '@stoplight/spectral-parsers/graphql';
import graphqlRuleset from '../index';
import { createDocument, createWithRules, RuleName } from './__helpers__/tester';

const ruleNames = Object.keys(graphqlRuleset.rules) as RuleName[];

const valid = `"""
The query root
"""
type Query {
  "Finds a pet"
  petById("The id" id: ID!): Pet
}

"A pet"
type Pet {
  "The name"
  name: String @deprecated(reason: "Use title")
  "The kind"
  kind: PetKind
}

"Kinds of pet"
enum PetKind {
  "A dog"
  DOG
  "A guinea pig"
  GUINEA_PIG
}
`;

describe('spectral:graphql ruleset', () => {
  it('reports nothing for a valid document', async () => {
    const results = await createWithRules(ruleNames).run(createDocument(valid));
    expect(results).toEqual([]);
  });

  it('reports syntax errors as parser diagnostics', async () => {
    const results = await createWithRules(ruleNames).run(createDocument('type Query {\n  pet: \n}'));
    expect(results.filter(({ code }) => code === 'parser')).toEqual([
      expect.objectContaining({
        code: 'parser',
        message: 'Expected Name, found "}".',
        range: { start: { line: 2, character: 0 }, end: { line: 2, character: 0 } },
      }),
    ]);
  });

  it('reports a syntax error without an unrecognized-format warning', async () => {
    const results = await createWithRules(ruleNames).run(createDocument('type Query {'));
    expect(results.map(({ code }) => code)).toEqual(['parser']);
  });

  it('does not apply to non-GraphQL documents', async () => {
    const results = await createWithRules(ruleNames).run(
      new Document(JSON.stringify({ definitions: [{ name: 'lower', fields: [{}] }] }), Parsers.Json),
    );
    expect(results.filter(({ code }) => String(code).startsWith('graphql-'))).toEqual([]);
  });

  it('registers the GraphQL parser for .graphql and .gql files', () => {
    expect(graphqlRuleset.parsers).toEqual([{ parser: Graphql, extensions: ['.graphql', '.graphqls', '.gql'] }]);
  });

  it('every rule is documented', () => {
    for (const rule of Object.values(graphqlRuleset.rules)) {
      expect(rule.description).toEqual(expect.any(String));
    }
  });
});

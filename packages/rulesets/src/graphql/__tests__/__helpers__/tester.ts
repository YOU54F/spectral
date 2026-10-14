import { Document, IRuleResult, RulesetDefinition, Spectral } from '@stoplight/spectral-core';
import { Graphql, GraphqlParserResult } from '@stoplight/spectral-parsers/graphql';
import graphqlRuleset from '../../index';

export type RuleName = keyof typeof graphqlRuleset.rules;

type Scenario = ReadonlyArray<
  Readonly<{
    name: string;
    document: string;
    errors: ReadonlyArray<Partial<IRuleResult>>;
  }>
>;

export function createWithRules(rules: RuleName[]): Spectral {
  const s = new Spectral();
  s.setRuleset({
    extends: [[graphqlRuleset as RulesetDefinition, 'off']],
    rules: Object.fromEntries(rules.map(name => [name, true])),
  });
  return s;
}

export const createDocument = (sdl: string): Document<unknown, GraphqlParserResult> =>
  new Document(sdl, Graphql, '/schema.graphql');

export default (ruleName: RuleName, tests: Scenario): void => {
  describe(`Rule ${ruleName}`, () => {
    for (const testCase of tests) {
      it.concurrent(testCase.name, async () => {
        const s = createWithRules([ruleName]);
        const results = await s.run(createDocument(testCase.document));
        expect(results.filter(({ code }) => code === ruleName)).toEqual(
          testCase.errors.map(error => expect.objectContaining(error) as unknown),
        );
      });
    }
  });
};

import { IRuleResult, Spectral, Document, RulesetDefinition } from '@stoplight/spectral-core';
import overlayRuleset from '../../index';

type Ruleset = typeof overlayRuleset;
export type RuleName = keyof Ruleset['rules'];

type Scenario = ReadonlyArray<
  Readonly<{
    name: string;
    document: Record<string, unknown> | Document<any, any>;
    errors: ReadonlyArray<Partial<IRuleResult>>;
  }>
>;

export default (ruleName: RuleName, tests: Scenario): void => {
  describe(`Rule ${ruleName}`, () => {
    for (const testCase of tests) {
      it.concurrent(testCase.name, async () => {
        const s = createWithRules([ruleName]);
        const doc = testCase.document instanceof Document ? testCase.document : JSON.stringify(testCase.document);
        const errors = await s.run(doc);
        expect(errors.filter(({ code }) => code === ruleName)).toEqual(
          testCase.errors.map(error => expect.objectContaining(error) as unknown),
        );
      });
    }
  });
};

export function createWithRules(rules: RuleName[]): Spectral {
  const s = new Spectral();

  s.setRuleset({
    extends: [[overlayRuleset as RulesetDefinition, 'off']],
    rules: rules.reduce<Record<string, boolean>>((obj, name) => {
      obj[name] = true;
      return obj;
    }, {}),
  });

  return s;
}

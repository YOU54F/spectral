import { serveAssets } from '@stoplight/spectral-test-utils';
import { IRuleResult, Spectral, Document, RulesetDefinition } from '@stoplight/spectral-core';
import { httpAndFileResolver } from '@stoplight/spectral-ref-resolver';
import oasRuleset from '../../oas/index';
import aasRuleset from '../../asyncapi/index';
import arazzoRuleset from '../../arazzo/index';
import a2aRuleset from '../../a2a/index';
import openrpcRuleset from '../../openrpc/index';
import avroRuleset from '../../avro/index';
import protobufRuleset from '../../protobuf/index';
import wsdlRuleset from '../../wsdl/index';

type Ruleset = typeof oasRuleset &
  typeof aasRuleset &
  typeof a2aRuleset &
  typeof openrpcRuleset &
  typeof avroRuleset &
  typeof protobufRuleset &
  typeof wsdlRuleset;
export type RuleName = keyof Ruleset['rules'];

type Scenario = ReadonlyArray<
  Readonly<{
    name: string;
    document: Record<string, unknown> | unknown[] | string | Document<any, any>;
    errors: ReadonlyArray<Partial<IRuleResult>>;
    mocks?: Record<string, Record<string, unknown>>;
  }>
>;

export default (ruleName: RuleName, tests: Scenario): void => {
  describe(`Rule ${ruleName}`, () => {
    const concurrent = tests.every(test => test.mocks === void 0 || Object.keys(test.mocks).length === 0);
    for (const testCase of tests) {
      (concurrent ? it.concurrent : it)(testCase.name, async () => {
        if (testCase.mocks !== void 0) {
          serveAssets(testCase.mocks);
        }

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

export function createWithRules(rules: (keyof Ruleset['rules'])[]): Spectral {
  const s = new Spectral({ resolver: httpAndFileResolver });

  s.setRuleset({
    extends: [
      [aasRuleset as RulesetDefinition, 'off'],
      [oasRuleset as RulesetDefinition, 'off'],
      [arazzoRuleset as RulesetDefinition, 'off'],
      [a2aRuleset, 'off'],
      [openrpcRuleset as RulesetDefinition, 'off'],
      [avroRuleset, 'off'],
      [protobufRuleset as RulesetDefinition, 'off'],
      [wsdlRuleset as RulesetDefinition, 'off'],
    ],
    rules: rules.reduce((obj, name) => {
      obj[name] = true;
      return obj;
    }, {}),
  });

  return s;
}

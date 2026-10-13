import { IRuleResult, Spectral, Document } from '@stoplight/spectral-core';
import mcpRuleset from '../../index';

export type RuleName = keyof (typeof mcpRuleset)['rules'];

type Scenario = ReadonlyArray<
  Readonly<{
    name: string;
    document: Record<string, unknown> | Document<any, any>;
    errors: ReadonlyArray<Partial<IRuleResult>>;
  }>
>;

export const validServer = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json',
  name: 'io.github.example/weather',
  title: 'Weather',
  description: 'Weather forecasts for MCP clients',
  version: '1.2.3',
  repository: {
    url: 'https://github.com/example/weather',
    source: 'github',
  },
  packages: [
    {
      registryType: 'npm',
      identifier: '@example/weather-mcp',
      version: '1.2.3',
      transport: {
        type: 'stdio',
      },
      environmentVariables: [
        {
          name: 'WEATHER_API_KEY',
          isSecret: true,
          isRequired: true,
        },
      ],
    },
  ],
  remotes: [
    {
      type: 'streamable-http',
      url: 'https://weather.example.com/mcp',
    },
  ],
};

export function server(overrides: Record<string, unknown>): Record<string, unknown> {
  return { ...JSON.parse(JSON.stringify(validServer)), ...overrides } as Record<string, unknown>;
}

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
    extends: [[mcpRuleset, 'off']],
    rules: rules.reduce((obj, name) => {
      obj[name] = true;
      return obj;
    }, {}),
  });

  return s;
}

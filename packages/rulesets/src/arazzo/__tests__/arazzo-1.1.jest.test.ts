import * as path from 'path';
import { DiagnosticSeverity } from '@stoplight/types';
import { Document, Spectral, RulesetDefinition } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import ruleset from '../index';

// fs is mocked globally in packages/rulesets/jest.setup.mjs
const fs = jest.requireActual<typeof import('fs')>('fs');

const fixture = fs.readFileSync(path.join(__dirname, '__fixtures__/petstore-checkout.arazzo.yaml'), 'utf8');

async function lint(doc: string | Record<string, unknown>) {
  const spectral = new Spectral();
  spectral.setRuleset(ruleset as RulesetDefinition);
  const source = typeof doc === 'string' ? doc : JSON.stringify(doc, null, 2);
  const results = await spectral.run(new Document(source, Parsers.Yaml, 'doc.arazzo.yaml'));
  return results.filter(r => r.severity === DiagnosticSeverity.Error);
}

const asyncDoc = (version: string, stepOverrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  arazzo: version,
  info: { title: 'Async', version: '1.0.0' },
  sourceDescriptions: [
    { name: 'petstore', url: './petstore.openapi.yaml', type: 'openapi' },
    { name: 'events', url: './events.asyncapi.yaml', type: 'asyncapi' },
  ],
  workflows: [
    {
      workflowId: 'orderAndWait',
      steps: [
        {
          stepId: 'createOrder',
          operationId: '$sourceDescriptions.petstore.createOrder',
          successCriteria: [{ condition: '$statusCode == 201' }],
          outputs: { orderId: '$response.body#/id' },
        },
        {
          stepId: 'publishOrder',
          channelPath: '{$sourceDescriptions.events.url}#/channels/orders',
          action: 'send',
          requestBody: { payload: { orderId: '$steps.createOrder.outputs.orderId' } },
        },
        {
          stepId: 'awaitDispatch',
          operationId: '$sourceDescriptions.events.onDispatched',
          action: 'receive',
          correlationId: '$steps.createOrder.outputs.orderId',
          timeout: 30000,
          dependsOn: ['publishOrder'],
          outputs: { trackingId: '$message.payload#/trackingId' },
          ...stepOverrides,
        },
      ],
    },
  ],
});

describe('Arazzo 1.1', () => {
  test('real-world 1.1 document (OpenAPI + AsyncAPI + Arazzo sources) has no errors', async () => {
    expect(await lint(fixture)).toEqual([]);
  });

  test('valid 1.1 AsyncAPI document (channelPath, action, correlationId, timeout, dependsOn) has no errors', async () => {
    expect(await lint(asyncDoc('1.1.0'))).toEqual([]);
  });

  test('1.1-only fields on a 1.0 document are flagged by the schema', async () => {
    const results = await lint(asyncDoc('1.0.1'));
    const schemaResults = results.filter(r => r.code === 'arazzo-document-schema');
    expect(schemaResults.length).toBeGreaterThan(0);
    const paths = schemaResults.map(r => r.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['sourceDescriptions.1.type']));
    expect(paths.some(p => p.startsWith('workflows.0.steps.2'))).toBe(true);
  });

  test('any 1.1.x patch version is validated against the 1.1 schema', async () => {
    const results = await lint({ ...asyncDoc('1.1.0'), arazzo: '1.1.3' });
    expect(results).toEqual([]);
  });

  test('invalid action value is flagged', async () => {
    const results = await lint(asyncDoc('1.1.0', { action: 'publish' }));
    expect(results.some(r => r.code === 'arazzo-document-schema')).toBe(true);
  });

  test('dependsOn referencing an unknown step is flagged', async () => {
    const results = await lint(asyncDoc('1.1.0', { dependsOn: ['nope'] }));
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'arazzo-step-validation',
          path: ['workflows', '0', 'steps', '2', 'dependsOn', '0'],
        }),
      ]),
    );
  });

  test('channelPath pointing at a non-AsyncAPI source is flagged', async () => {
    const doc = asyncDoc('1.1.0');
    const steps = (doc.workflows as { steps: Record<string, unknown>[] }[])[0].steps;
    steps[1].channelPath = '{$sourceDescriptions.petstore.url}#/channels/orders';
    const results = await lint(doc);
    expect(
      results.some(r => r.code === 'arazzo-step-validation' && r.path.join('.') === 'workflows.0.steps.1.channelPath'),
    ).toBe(true);
  });
});

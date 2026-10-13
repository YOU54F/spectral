import * as path from 'path';
import { DiagnosticSeverity } from '@stoplight/types';
import { Document, Spectral } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import ruleset from '../index';

// fs is mocked globally in packages/rulesets/jest.setup.mjs
const fs = jest.requireActual<typeof import('fs')>('fs');

const readFixture = (name: string) => fs.readFileSync(path.join(__dirname, '__fixtures__', name), 'utf8');

async function lint(doc: string | Record<string, unknown>) {
  const spectral = new Spectral();
  spectral.setRuleset(ruleset);
  const source = typeof doc === 'string' ? doc : JSON.stringify(doc, null, 2);
  const results = await spectral.run(new Document(source, Parsers.Yaml, 'doc.arazzo.yaml'));
  return results.filter(r => r.severity === DiagnosticSeverity.Error);
}

const soapDoc = (version: string, stepOverrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  arazzo: version,
  info: { title: 'SOAP', version: '1.0.0' },
  sourceDescriptions: [{ name: 'bureau', url: './bureau.wsdl', type: 'wsdl' }],
  workflows: [
    {
      workflowId: 'getScore',
      steps: [
        {
          stepId: 'getReport',
          operationName: '$sourceDescriptions.bureau.GetCreditReport',
          parameters: [{ name: 'SOAPAction', in: 'header', value: 'urn:bureau/GetCreditReport' }],
          successCriteria: [
            { condition: '$statusCode == 200' },
            {
              context: '$response.body',
              condition: "//*[local-name()='Fault']",
              type: { type: 'xpath', version: 'xpath-31' },
            },
          ],
          outputs: { score: '$response.body' },
          ...stepOverrides,
        },
      ],
    },
  ],
});

describe('Arazzo 1.2', () => {
  test.each(['credit-bureau.arazzo-1.2.yaml', 'petstore-checkout.arazzo-1.2.yaml'])(
    'real-world 1.2 document %s has no errors',
    async name => {
      expect(await lint(readFixture(name))).toEqual([]);
    },
  );

  test('valid 1.2 SOAP document (wsdl source, operationName step, xpath-31) has no errors', async () => {
    expect(await lint(soapDoc('1.2.0'))).toEqual([]);
  });

  test.each(['1.0.0', '1.1.0'])('wsdl source and operationName step are flagged on a %s document', async version => {
    const results = await lint(soapDoc(version));
    const paths = results.filter(r => r.code === 'arazzo-document-schema').map(r => r.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['sourceDescriptions.0.type']));
    expect(paths.some(p => p.startsWith('workflows.0.steps.0'))).toBe(true);
  });

  test('operationName referencing an unknown source description is flagged', async () => {
    const results = await lint(soapDoc('1.2.0', { operationName: '$sourceDescriptions.nope.GetCreditReport' }));
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'arazzo-step-validation',
          path: ['workflows', '0', 'steps', '0', 'operationName'],
        }),
      ]),
    );
  });

  test('operationName pointing at a non-WSDL source is flagged', async () => {
    const doc = soapDoc('1.2.0');
    (doc.sourceDescriptions as Record<string, unknown>[])[0].type = 'openapi';
    const results = await lint(doc);
    expect(
      results.some(
        r => r.code === 'arazzo-step-validation' && r.path.join('.') === 'workflows.0.steps.0.operationName',
      ),
    ).toBe(true);
  });

  test('operationName step parameters must have "in"', async () => {
    const results = await lint(soapDoc('1.2.0', { parameters: [{ name: 'SOAPAction', value: 'x' }] }));
    expect(results.length).toBeGreaterThan(0);
  });
});

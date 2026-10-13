import { DiagnosticSeverity } from '@stoplight/types';
import chalk from 'chalk';
import { stylish } from '../stylish';

import oas3SchemaErrors from './__fixtures__/oas3-schema-errors.json';
import mixedErrors from './__fixtures__/mixed-errors.json';

describe('Stylish formatter', () => {
  test('should prefer message for oas-schema errors', () => {
    const result = stylish(oas3SchemaErrors, { failSeverity: DiagnosticSeverity.Error });
    expect(result).toContain('oas3-schema  should NOT have additional properties: type');
    expect(result).toContain('oas3-schema  should match exactly one schema in oneOf');
    expect(result).toContain("oas3-schema  should have required property '$ref'");
  });

  test('should display proper severity level', () => {
    const result = stylish(mixedErrors, { failSeverity: DiagnosticSeverity.Error });
    expect(result).toContain(`
  3:10         ${chalk.white(
    'hint',
  )}  info-contact            Info object should contain \`contact\` object.                             info
  3:10      ${chalk.yellow(
    'warning',
  )}  info-description        OpenAPI object info \`description\` must be present and non-empty string.  info
  5:14        ${chalk.red(
    'error',
  )}  info-matches-stoplight  Info must contain Stoplight                                              info.title
 17:13  ${chalk.blue(
   'information',
 )}  operation-description   Operation \`description\` must be present and non-empty string.            paths./pets.get
 64:14  ${chalk.blue(
   'information',
 )}  operation-description   Operation \`description\` must be present and non-empty string.            paths./pets.post
 86:13  ${chalk.blue(
   'information',
 )}  operation-description   Operation \`description\` must be present and non-empty string.            paths./pets/{petId}.get`);
  });

  test('should not alter numbers separated by whitespace in the message (#2487)', () => {
    const result = stylish(
      [
        {
          code: 'numeric-message',
          message: 'Value 12 34 is not allowed, use 1 2 3',
          path: ['info'],
          severity: DiagnosticSeverity.Error,
          source: 'test.yaml',
          range: { start: { line: 2, character: 9 }, end: { line: 2, character: 12 } },
        },
      ],
      { failSeverity: DiagnosticSeverity.Error },
    );
    expect(result).toContain('Value 12 34 is not allowed, use 1 2 3');
    expect(result).not.toContain('12:34');
    expect(result).toContain('3:10');
  });
});

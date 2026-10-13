import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

const SECRET_WORDS = new Set([
  'token',
  'secret',
  'secrets',
  'password',
  'passwd',
  'pwd',
  'credential',
  'credentials',
  'apikey',
  'pat',
  'authorization',
]);

const SECRET_PAIRS: ReadonlyArray<readonly [string, string]> = [
  ['api', 'key'],
  ['access', 'key'],
  ['private', 'key'],
  ['client', 'secret'],
];

const TEMPLATE_VARIABLE = /{[^{}]+}/;

function splitWords(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .map(word => word.toLowerCase())
    .filter(word => word.length > 0);
}

export function looksLikeSecret(name: string): boolean {
  const words = splitWords(name);
  if (words.some(word => SECRET_WORDS.has(word))) return true;
  return words.some((word, i) => SECRET_PAIRS.some(([first, second]) => word === first && words[i + 1] === second));
}

function getInputName(input: Record<string, unknown>, path: ReadonlyArray<string | number>): string | null {
  for (const key of ['name', 'valueHint']) {
    const value = input[key];
    if (typeof value === 'string' && value.length > 0) return value;
  }

  const last = path[path.length - 1];
  return typeof last === 'string' ? last : null;
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpSecretInput(input, _opts, { path }) {
    const name = getInputName(input, path);
    if (name === null || !looksLikeSecret(name)) return;

    const results: IFunctionResult[] = [];

    if (input.isSecret !== true) {
      results.push({
        message: `Input "${name}" looks like a secret and should set "isSecret": true.`,
      });
    }

    const { value, default: defaultValue } = input;
    for (const [field, fieldValue] of [
      ['value', value],
      ['default', defaultValue],
    ] as const) {
      if (typeof fieldValue === 'string' && fieldValue.length > 0 && !TEMPLATE_VARIABLE.test(fieldValue)) {
        results.push({
          message: `Input "${name}" looks like a secret and must not hard-code a "${field}"; use a "{variable}" placeholder instead.`,
          path: [...path, field],
        });
      }
    }

    return results;
  },
);

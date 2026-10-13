import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject, resolveInlineRef } from '@stoplight/json';
import type { ErrorObject } from 'ajv';
import leven from 'leven';

import * as validators from '../schemas/validators';

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function mcpServerSchema(input) {
    const validator = validators.mcpServer2025_12_11;

    if (typeof validator !== 'function') {
      throw new Error('Validator for MCP server.json schema is not a function');
    }

    validator(input);

    const errors = validator['errors'] as ErrorObject[] | null;

    return collapseDiscriminatorErrors(errors ?? []).reduce<IFunctionResult[]>(
      (results, e) => processError(results, input, e),
      [],
    );
  },
);

/**
 * Transports and arguments are unions (anyOf) discriminated by "type". When the "type" does not match any branch,
 * ajv reports an enum error per branch together with every other error of each branch.
 * Merge these into a single enum error and drop the unrelated "required" errors of the non-matching branches.
 */
function collapseDiscriminatorErrors(errors: ErrorObject[]): ErrorObject[] {
  const discriminatorErrors = new Map<string, ErrorObject>();

  for (const error of errors) {
    if (error.keyword !== 'enum' || !error.instancePath.endsWith('/type')) continue;

    const existing = discriminatorErrors.get(error.instancePath);
    const allowedValues = error.params['allowedValues'] as unknown[];
    if (existing === void 0) {
      discriminatorErrors.set(error.instancePath, { ...error, params: { allowedValues: [...allowedValues] } });
    } else {
      const merged = existing.params['allowedValues'] as unknown[];
      merged.push(...allowedValues.filter(value => !merged.includes(value)));
    }
  }

  if (discriminatorErrors.size === 0) return errors;

  const parents = new Set(Array.from(discriminatorErrors.keys(), path => path.slice(0, -'/type'.length)));
  const result: ErrorObject[] = [];

  const emitted = new Set<string>();

  for (const error of errors) {
    const merged = error.keyword === 'enum' ? discriminatorErrors.get(error.instancePath) : void 0;
    if (merged !== void 0) {
      if (!emitted.has(error.instancePath)) {
        emitted.add(error.instancePath);
        result.push(merged);
      }
    } else if (!(error.keyword === 'required' && parents.has(error.instancePath))) {
      result.push(error);
    }
  }

  return result;
}

// Combinator keywords produce noise on top of the more specific errors reported for their branches.
const IGNORED_KEYWORDS = new Set(['if', 'anyOf', 'allOf', 'oneOf']);

function processError(results: IFunctionResult[], input: unknown, error: ErrorObject): IFunctionResult[] {
  if (IGNORED_KEYWORDS.has(error.keyword)) {
    return results;
  }

  const path = error.instancePath === '' ? [] : error.instancePath.slice(1).split('/');
  const property = path.length === 0 ? null : path[path.length - 1];

  let message: string;

  switch (error.keyword) {
    case 'additionalProperties': {
      const additionalProperty = error.params['additionalProperty'] as string;
      path.push(additionalProperty);
      message = `Property "${additionalProperty}" is not expected to be here`;
      break;
    }

    case 'enum': {
      const allowedValues = error.params['allowedValues'] as unknown[];
      const printedValues = allowedValues.map(value => JSON.stringify(value)).join(', ');
      let suggestion = '';

      if (isPlainObject(input)) {
        const value = resolveInlineRef(input, `#${error.instancePath}`);
        if (typeof value === 'string') {
          const bestMatch = findBestMatch(value, allowedValues);
          if (bestMatch !== null) {
            suggestion = `. Did you mean "${bestMatch}"?`;
          }
        }
      }

      message = `${cleanAjvMessage(property, error.message)}: ${printedValues}${suggestion}`;
      break;
    }

    default:
      message = cleanAjvMessage(property, error.message);
  }

  // anyOf branches (e.g. transports) can yield the same error several times
  if (results.some(result => result.message === message && result.path?.join('/') === path.join('/'))) {
    return results;
  }

  results.push({
    message,
    path,
  });

  return results;
}

function findBestMatch(value: string, allowedValues: unknown[]): string | null {
  const matches = allowedValues
    .filter<string>((value): value is string => typeof value === 'string')
    .map(allowedValue => ({
      value: allowedValue,
      weight: leven(value, allowedValue),
    }))
    .sort((x, y) => x.weight - y.weight);

  if (matches.length === 0) {
    return null;
  }

  const bestMatch = matches[0];

  return allowedValues.length === 1 || bestMatch.weight < bestMatch.value.length ? bestMatch.value : null;
}

const QUOTES = /['"]/g;
const NOT = /NOT/g;

function cleanAjvMessage(prop: string | null, message: string | undefined): string {
  if (typeof message !== 'string') return '';

  const cleanedMessage = message.replace(QUOTES, '"').replace(NOT, 'not');
  return prop === null ? cleanedMessage : `"${prop}" property ${cleanedMessage}`;
}

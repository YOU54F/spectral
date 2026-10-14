import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { openrpc1 } from '@stoplight/spectral-formats';
import { isPlainObject, resolveInlineRef } from '@stoplight/json';
import type { ErrorObject } from 'ajv';
import leven from 'leven';

import * as validators from '../schemas/validators';

type SchemaVersion = 'openrpc1_3' | 'openrpc1_4';

const OPENRPC_1_0_TO_1_3 = /^1\.[0-3]\.[0-9]+(?:-rc[0-9]+)?$/;

// these checks are covered by dedicated rules (openrpc-server-url & openrpc-param-structure),
// which understand server variables and relative urls & give better messages
const COVERED_BY_OTHER_RULES: ReadonlyArray<[keyword: string, path: RegExp]> = [
  ['format', /^\/(?:methods\/[^/]+\/)?servers\/[^/]+\/url$/],
  ['enum', /^\/methods\/[^/]+\/paramStructure$/],
];

export function getSchemaVersion(input: unknown): SchemaVersion {
  const version = isPlainObject(input) ? input.openrpc : null;
  return typeof version === 'string' && OPENRPC_1_0_TO_1_3.test(version) ? 'openrpc1_3' : 'openrpc1_4';
}

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function openrpcDocumentSchema(input, _opts, context) {
    const formats = context.document.formats;
    if (formats === null || formats === void 0 || !formats.has(openrpc1)) return;

    const validator = validators[getSchemaVersion(input)];

    validator(input);

    const errors = (validator['errors'] as ErrorObject[] | null) ?? [];
    const relevantErrors = errors.filter(error => isRelevantError(error, errors));

    return relevantErrors.reduce<IFunctionResult[]>((results, e) => processError(results, input, e), []);
  },
);

function isRelevantError(error: ErrorObject, errors: ErrorObject[]): boolean {
  if (error.keyword === 'if') {
    return false;
  }

  if (COVERED_BY_OTHER_RULES.some(([keyword, path]) => keyword === error.keyword && path.test(error.instancePath))) {
    return false;
  }

  // generic "must match a schema in anyOf/oneOf" errors are only useful if there is nothing more specific
  if (error.keyword === 'anyOf' || error.keyword === 'oneOf') {
    return !errors.some(
      other =>
        other !== error &&
        other.keyword !== 'if' &&
        (other.instancePath === error.instancePath || other.instancePath.startsWith(`${error.instancePath}/`)),
    );
  }

  // e.g. JSON Schema "type": "strin" -> report the enum mismatch only, not the "must be array" alternative
  if (error.keyword === 'type') {
    return !errors.some(other => other.keyword === 'enum' && other.instancePath === error.instancePath);
  }

  return true;
}

function processError(errors: IFunctionResult[], input: unknown, error: ErrorObject): IFunctionResult[] {
  const path = error.instancePath === '' ? [] : error.instancePath.slice(1).split('/').map(unescapePointer);
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

  errors.push({
    message,
    path,
  });

  return errors;
}

function unescapePointer(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function findBestMatch(value: string, allowedValues: unknown[]): string | null {
  const matches = allowedValues
    .filter<string>((value): value is string => typeof value === 'string')
    .map(allowedValue => ({
      value: allowedValue,
      weight: leven(value, allowedValue),
    }))
    .sort((x, y) => (x.weight > y.weight ? 1 : x.weight < y.weight ? -1 : 0));

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

import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { a2aAgentCard0_3, a2aAgentCard1_0 } from '@stoplight/spectral-formats';
import { isPlainObject, resolveInlineRef } from '@stoplight/json';
import type { ErrorObject } from 'ajv';
import leven from 'leven';

import * as validators from '../schemas/validators';

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function a2aAgentCardSchema(input, _opts, context) {
    const formats = context.document.formats;
    if (formats === null || formats === void 0) return;

    // A card that carries `supportedInterfaces` is validated as 1.0, even if it also has legacy 0.3 fields.
    const validator = formats.has(a2aAgentCard1_0)
      ? validators.a2aAgentCard1_0
      : formats.has(a2aAgentCard0_3)
        ? validators.a2aAgentCard0_3
        : null;

    if (validator === null) return;

    validator(input);

    const errors = validator['errors'] as ErrorObject[] | null;

    return errors?.reduce<IFunctionResult[]>((errors, e) => processError(errors, input, e), []) ?? [];
  },
);

function isRelevantError(error: ErrorObject): boolean {
  return error.keyword !== 'if';
}

function processError(errors: IFunctionResult[], input: unknown, error: ErrorObject): IFunctionResult[] {
  if (!isRelevantError(error)) {
    return errors;
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

    case 'minProperties':
    case 'maxProperties':
      // proto `oneof` wrappers (SecurityScheme, OAuthFlows)
      message = `${property === null ? 'Object' : `"${property}" property`} must define exactly one member`;
      break;

    default:
      message = cleanAjvMessage(property, error.message);
  }

  errors.push({
    message,
    path,
  });

  return errors;
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

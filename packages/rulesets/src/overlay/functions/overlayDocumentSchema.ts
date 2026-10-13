import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { overlay1_0, overlay1_1, overlay1_2 } from '@stoplight/spectral-formats';
import { isPlainObject, resolveInlineRef } from '@stoplight/json';
import type { ErrorObject } from 'ajv';
import leven from 'leven';

import * as validators from '../schemas/validators';

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function overlayDocumentSchema(input, _opts, context) {
    const formats = context.document.formats;
    if (formats === null || formats === void 0) return;

    const validator = formats.has(overlay1_2)
      ? validators.overlay1_2
      : formats.has(overlay1_1)
        ? validators.overlay1_1
        : formats.has(overlay1_0)
          ? validators.overlay1_0
          : null;

    if (validator === null) return;

    validator(input);

    let errors = (validator['errors'] as ErrorObject[] | null) ?? [];

    if (validator === validators.overlay1_2 && isPlainObject(input) && Array.isArray(input.actions)) {
      errors = narrowActionErrors(input.actions, errors);
    }

    const results = errors.reduce<IFunctionResult[]>((results, e) => processError(results, input, e), []);
    return dedupe(results);
  },
);

const ACTION_PATH = /^\/actions\/(\d+)(?:\/|$)/;

/**
 * In Overlay 1.2, every action is either an Action Object or a Reusable Action Reference Object ("oneOf").
 * When an action is invalid, Ajv reports the errors of both branches, which is confusing.
 * Instead, the action is validated against the branch it was most likely meant to be: a reference if it has "$ref".
 */
function narrowActionErrors(actions: unknown[], errors: ErrorObject[]): ErrorObject[] {
  const narrowed: ErrorObject[] = [];
  const handled = new Set<number>();

  for (const error of errors) {
    const match = ACTION_PATH.exec(error.instancePath);
    if (match === null) {
      narrowed.push(error);
      continue;
    }

    const index = Number(match[1]);
    if (handled.has(index)) continue;
    handled.add(index);

    const action = actions[index];
    const branch =
      isPlainObject(action) && '$ref' in action ? validators.overlay1_2_actionReference : validators.overlay1_2_action;

    branch(action);
    for (const branchError of (branch['errors'] as ErrorObject[] | null) ?? []) {
      narrowed.push({
        ...branchError,
        instancePath: `/actions/${index}${branchError.instancePath}`,
      });
    }
  }

  return narrowed;
}

function dedupe(results: IFunctionResult[]): IFunctionResult[] {
  const seen = new Set<string>();
  return results.filter(result => {
    const key = JSON.stringify([result.message, result.path]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRelevantError(error: ErrorObject): boolean {
  // "if" and "oneOf" are reported alongside the more specific errors of their subschemas
  return error.keyword !== 'if' && error.keyword !== 'oneOf';
}

function processError(errors: IFunctionResult[], input: unknown, error: ErrorObject): IFunctionResult[] {
  if (!isRelevantError(error)) {
    return errors;
  }

  const path =
    error.instancePath === ''
      ? []
      : error.instancePath
          .slice(1)
          .split('/')
          .map(segment => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  const property = path.length === 0 ? null : path[path.length - 1];

  let message: string;

  switch (error.keyword) {
    case 'additionalProperties': {
      const additionalProperty = error.params['additionalProperty'] as string;
      path.push(additionalProperty);
      message = `Property "${additionalProperty}" is not expected to be here`;
      break;
    }

    case 'unevaluatedProperties': {
      const unevaluatedProperty = error.params['unevaluatedProperty'] as string;
      path.push(unevaluatedProperty);
      message = `Property "${unevaluatedProperty}" is not expected to be here`;
      break;
    }

    case 'enum': {
      const allowedValues = error.params['allowedValues'] as unknown[];
      const printedValues = allowedValues.map(value => JSON.stringify(value)).join(', ');
      let suggestion: string;

      if (!isPlainObject(input)) {
        suggestion = '';
      } else {
        const value = resolveInlineRef(input, `#${error.instancePath}`);
        if (typeof value !== 'string') {
          suggestion = '';
        } else {
          const bestMatch = findBestMatch(value, allowedValues);

          if (bestMatch !== null) {
            suggestion = `. Did you mean "${bestMatch}"?`;
          } else {
            suggestion = '';
          }
        }
      }

      message = `${cleanAjvMessage(property, error.message)}: ${printedValues}${suggestion}`;
      break;
    }

    case 'errorMessage':
      message = String(error.message);
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

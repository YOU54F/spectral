import { isPlainObject } from '@stoplight/json';

export function isObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Yields [index, item] pairs for all plain-object items of an array (non-arrays yield nothing).
 */
export function* objectEntries(value: unknown): Generator<[number, Record<string, unknown>]> {
  if (!Array.isArray(value)) return;
  for (const [i, item] of value.entries()) {
    if (isObject(item)) {
      yield [i, item];
    }
  }
}

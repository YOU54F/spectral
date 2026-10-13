import { isPlainObject } from '@stoplight/json';

export function isObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value);
}

import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

type MaybeArazzo = { arazzo: unknown } & Record<string, unknown>;

const arazzo1_0Regex = /^1\.0(?:\.[0-9]*)?$/;
const arazzo1_1Regex = /^1\.1(?:\.[0-9]*)?$/;

const isArazzo =
  (regex: RegExp) =>
  (document: unknown): document is { arazzo: string } & Record<string, unknown> =>
    isPlainObject(document) && 'arazzo' in document && regex.test(String((document as MaybeArazzo).arazzo));

export const arazzo1_0: Format = isArazzo(arazzo1_0Regex);
arazzo1_0.displayName = 'Arazzo 1.0.x';

export const arazzo1_1: Format = isArazzo(arazzo1_1Regex);
arazzo1_1.displayName = 'Arazzo 1.1.x';

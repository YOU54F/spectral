import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

type MaybeOverlay = { overlay: unknown } & Record<string, unknown>;

const overlay1_0Regex = /^1\.0(?:\.[0-9]*)?$/;
const overlay1_1Regex = /^1\.1(?:\.[0-9]*)?$/;
const overlay1_2Regex = /^1\.2(?:\.[0-9]*)?$/;

const isOverlay = (document: unknown): document is { overlay: string } & Record<string, unknown> =>
  isPlainObject(document) && 'overlay' in document && typeof (document as MaybeOverlay).overlay === 'string';

// `update` values are fragments merged into the target document, so their $refs are relative to that document
// and must not be resolved against the Overlay itself. (`copy` and `target` are JSONPath strings, not fragments.)
const actionFragments = ['$.actions[*].update'];
const reusableActionFragments = [...actionFragments, '$.components.actions[*].fields.update'];

export const overlay1_0: Format = document => isOverlay(document) && overlay1_0Regex.test(document.overlay);
overlay1_0.displayName = 'OpenAPI Overlay 1.0.x';
overlay1_0.unresolvedPaths = actionFragments;

export const overlay1_1: Format = document => isOverlay(document) && overlay1_1Regex.test(document.overlay);
overlay1_1.displayName = 'OpenAPI Overlay 1.1.x';
overlay1_1.unresolvedPaths = actionFragments;

export const overlay1_2: Format = document => isOverlay(document) && overlay1_2Regex.test(document.overlay);
overlay1_2.displayName = 'OpenAPI Overlay 1.2.x';
overlay1_2.unresolvedPaths = reusableActionFragments;

export const overlay1: Format = document =>
  overlay1_0(document, null) || overlay1_1(document, null) || overlay1_2(document, null);
overlay1.displayName = 'OpenAPI Overlay 1.x';
overlay1.unresolvedPaths = reusableActionFragments;

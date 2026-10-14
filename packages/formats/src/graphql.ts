import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

// Matches documents produced by the GraphQL parser of @stoplight/spectral-parsers.
const isGraphql = (document: unknown): document is { kind: 'Document'; definitions: unknown[] } =>
  isPlainObject(document) && document.kind === 'Document' && Array.isArray(document.definitions);

export const graphql: Format = isGraphql;
graphql.displayName = 'GraphQL';

import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

const SYNTAXES = ['proto2', 'proto3', 'editions'];

// Matches the tree produced by the Protobuf parser in @stoplight/spectral-parsers.
// A `syntax` of proto2/proto3/editions next to the imports/messages/enums/services arrays
// is not something an OpenAPI, AsyncAPI or JSON Schema document has.
const isProtobuf = (document: unknown): document is { syntax: string } & Record<string, unknown> =>
  isPlainObject(document) &&
  typeof document.syntax === 'string' &&
  SYNTAXES.includes(document.syntax) &&
  Array.isArray(document.imports) &&
  Array.isArray(document.messages) &&
  Array.isArray(document.enums) &&
  Array.isArray(document.services);

export const protobuf: Format = isProtobuf;
protobuf.displayName = 'Protocol Buffers';

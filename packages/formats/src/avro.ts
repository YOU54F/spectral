import type { Format } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

const PRIMITIVE_TYPES = new Set(['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string']);

// key that every named type of a given kind must declare, used to tell Avro apart from other JSON documents
const NAMED_TYPES: Record<string, string> = {
  record: 'fields',
  enum: 'symbols',
  fixed: 'size',
};

// documents carrying any of these keys are certainly something else (JSON Schema, OpenAPI, AsyncAPI, ...)
const FOREIGN_KEYS = ['$schema', 'openapi', 'swagger', 'asyncapi', 'arazzo', 'properties'];

const FULLNAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$/;
const AVSC_EXTENSION_REGEX = /\.avsc$/i;

const isNamedSchema = (value: unknown): boolean => {
  if (!isPlainObject(value)) return false;
  const { type, name } = value;
  if (typeof type !== 'string' || typeof name !== 'string' || !(type in NAMED_TYPES)) return false;
  if (FOREIGN_KEYS.some(key => key in value)) return false;
  return NAMED_TYPES[type] in value;
};

const isSchemaLike = (value: unknown): boolean => {
  if (typeof value === 'string') return PRIMITIVE_TYPES.has(value) || FULLNAME_REGEX.test(value);
  if (!isPlainObject(value)) return false;
  if (isNamedSchema(value)) return true;
  const { type } = value;
  return (
    (type === 'array' && 'items' in value) ||
    (type === 'map' && 'values' in value) ||
    (typeof type === 'string' && PRIMITIVE_TYPES.has(type) && !FOREIGN_KEYS.some(key => key in value))
  );
};

const hasAvscExtension = (source: string | null): boolean =>
  typeof source === 'string' && AVSC_EXTENSION_REGEX.test(source.replace(/[?#].*$/, ''));

/**
 * Apache Avro schema declaration (.avsc).
 * Matches when either:
 * - the source has an `.avsc` extension, or
 * - the document is a named type (record/enum/fixed with `name` and the type-specific `fields`/`symbols`/`size`), or
 * - the document is a top-level union array whose members all look like Avro schemas, with at least one named type.
 */
const isAvro = (document: unknown, source: string | null): boolean => {
  if (hasAvscExtension(source)) {
    return isPlainObject(document) || Array.isArray(document) || typeof document === 'string';
  }

  if (isNamedSchema(document)) return true;

  return Array.isArray(document) && document.length > 0 && document.every(isSchemaLike) && document.some(isNamedSchema);
};

export const avro1: Format = isAvro;
avro1.displayName = 'Avro 1.x';

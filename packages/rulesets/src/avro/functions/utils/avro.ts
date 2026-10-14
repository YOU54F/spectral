import { isPlainObject } from '@stoplight/json';

export type JsonPath = (string | number)[];
export type AvroObject = Record<string, unknown>;

export const PRIMITIVE_TYPES: ReadonlySet<string> = new Set([
  'null',
  'boolean',
  'int',
  'long',
  'float',
  'double',
  'bytes',
  'string',
]);

export const NAMED_TYPES: ReadonlySet<string> = new Set(['record', 'error', 'enum', 'fixed']);

export const NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const isValidName = (name: unknown): boolean => typeof name === 'string' && NAME_REGEX.test(name);

export const isValidFullname = (name: unknown): boolean =>
  typeof name === 'string' && name.split('.').every(part => NAME_REGEX.test(part));

/** The empty string denotes the null namespace; otherwise a dot-separated sequence of names. */
export const isValidNamespace = (namespace: unknown): boolean => namespace === '' || isValidFullname(namespace);

export type NamedDefinition = {
  kind: string;
  /** the fully qualified name, e.g. `com.example.User` */
  fullname: string;
  /** namespace of the definition, used as the enclosing namespace of its children; '' is the null namespace */
  namespace: string;
  schema: AvroObject;
  path: JsonPath;
};

export type SchemaNode = {
  schema: unknown;
  path: JsonPath;
  /** enclosing namespace */
  namespace: string;
};

export type FieldNode = {
  field: AvroObject;
  path: JsonPath;
  record: NamedDefinition;
};

export type TypeReference = {
  name: string;
  path: JsonPath;
  namespace: string;
  /** the definition the reference resolves to, if any */
  resolved: NamedDefinition | null;
  /** whether the definition was already seen at the point of reference */
  definedBefore: boolean;
};

export type AvroAnalysis = {
  /** every named type definition, in document order (duplicates included) */
  named: NamedDefinition[];
  /** first definition of each full name */
  definitions: Map<string, NamedDefinition>;
  references: TypeReference[];
  /** every schema position (including union arrays and type names) */
  schemas: SchemaNode[];
  fields: FieldNode[];
  resolve(name: string, namespace: string): NamedDefinition | null;
};

export const describeType = (schema: unknown): string => {
  if (typeof schema === 'string') return schema;
  if (Array.isArray(schema)) return `union [${schema.map(describeType).join(', ')}]`;
  if (isPlainObject(schema)) {
    if (typeof schema.name === 'string' && typeof schema.type === 'string' && NAMED_TYPES.has(schema.type)) {
      return `${schema.type} "${schema.name}"`;
    }

    if (typeof schema.type === 'string') return schema.type;
  }

  return 'unknown';
};

const qualify = (name: string, namespace: string): string =>
  name.includes('.') || namespace === '' ? name : `${namespace}.${name}`;

/**
 * Computes the full name and namespace of a named type definition, following the spec:
 * a dotted `name` is a full name (and `namespace` is ignored), otherwise `namespace` (if any) or the enclosing namespace.
 */
export const getFullname = (name: string, namespace: unknown, enclosing: string): [string, string] => {
  if (name.includes('.')) {
    return [name, name.slice(0, name.lastIndexOf('.'))];
  }

  const ns = typeof namespace === 'string' ? namespace : enclosing;
  return [qualify(name, ns), ns];
};

const cache = new WeakMap<object, AvroAnalysis>();

/**
 * Walks an Avro schema declaration (depth first, in document order, the same order Avro parsers use),
 * collecting named type definitions, references, fields and every schema position.
 */
export function analyze(document: unknown): AvroAnalysis {
  if (typeof document === 'object' && document !== null) {
    const cached = cache.get(document);
    if (cached !== void 0) return cached;
  }

  const definitions = new Map<string, NamedDefinition>();

  const resolve = (name: string, namespace: string): NamedDefinition | null => {
    if (name.includes('.')) return definitions.get(name) ?? null;
    // the spec resolves unqualified names against the enclosing namespace;
    // like the reference (Java) implementation we fall back to the null namespace.
    return definitions.get(qualify(name, namespace)) ?? definitions.get(name) ?? null;
  };

  const analysis: AvroAnalysis = {
    named: [],
    definitions,
    references: [],
    schemas: [],
    fields: [],
    resolve,
  };

  const reference = (name: string, path: JsonPath, namespace: string): void => {
    const resolved = resolve(name, namespace);
    analysis.references.push({ name, path, namespace, resolved, definedBefore: resolved !== null });
  };

  const walk = (schema: unknown, path: JsonPath, namespace: string): void => {
    analysis.schemas.push({ schema, path, namespace });

    if (typeof schema === 'string') {
      if (!PRIMITIVE_TYPES.has(schema)) {
        reference(schema, path, namespace);
      }

      return;
    }

    if (Array.isArray(schema)) {
      schema.forEach((member, i) => walk(member, [...path, i], namespace));
      return;
    }

    if (!isPlainObject(schema)) return;

    const { type } = schema;

    if (typeof type === 'string' && NAMED_TYPES.has(type)) {
      let ns = namespace;
      if (typeof schema.name === 'string') {
        const [fullname, definitionNamespace] = getFullname(schema.name, schema.namespace, namespace);
        ns = definitionNamespace;
        const definition: NamedDefinition = { kind: type, fullname, namespace: ns, schema, path };
        analysis.named.push(definition);
        if (!definitions.has(fullname)) {
          definitions.set(fullname, definition);
        }

        if ((type === 'record' || type === 'error') && Array.isArray(schema.fields)) {
          schema.fields.forEach((field, i) => {
            if (!isPlainObject(field)) return;
            analysis.fields.push({ field, path: [...path, 'fields', i], record: definition });
            if ('type' in field) {
              walk(field.type, [...path, 'fields', i, 'type'], ns);
            }
          });
        }
      }

      return;
    }

    if (type === 'array' && 'items' in schema) {
      walk(schema.items, [...path, 'items'], namespace);
    } else if (type === 'map' && 'values' in schema) {
      walk(schema.values, [...path, 'values'], namespace);
    } else if (typeof type === 'string') {
      if (!PRIMITIVE_TYPES.has(type) && type !== 'array' && type !== 'map') {
        // {"type": "com.example.Foo"} is a reference in object form
        reference(type, [...path, 'type'], namespace);
      }
    } else if (type !== void 0) {
      // not allowed by the spec (reported by avro-schema), but analyse the nested schema anyway
      walk(type, [...path, 'type'], namespace);
    }
  };

  walk(document, [], '');

  // references that only resolve to a definition appearing later in the document
  for (const ref of analysis.references) {
    ref.resolved ??= resolve(ref.name, ref.namespace);
  }

  if (typeof document === 'object' && document !== null) {
    cache.set(document, analysis);
  }

  return analysis;
}

/**
 * Returns true if the JSON value is a valid default value for the given Avro schema (spec: "Complex Types / Records" table).
 * Unions accept a value matching any member (Avro 1.12); unresolvable references are accepted (reported elsewhere).
 */
export function isValidDefault(value: unknown, schema: unknown, namespace: string, analysis: AvroAnalysis): boolean {
  if (Array.isArray(schema)) {
    return matchingUnionBranch(value, schema, namespace, analysis) !== -1;
  }

  if (typeof schema === 'string') {
    if (PRIMITIVE_TYPES.has(schema)) return isValidPrimitive(value, schema);
    const definition = analysis.resolve(schema, namespace);
    return definition === null || isValidDefault(value, definition.schema, definition.namespace, analysis);
  }

  if (!isPlainObject(schema)) return true;

  const { type } = schema;
  if (typeof type !== 'string') return true;
  if (PRIMITIVE_TYPES.has(type)) return isValidPrimitive(value, type);

  switch (type) {
    case 'record':
    case 'error': {
      if (!isPlainObject(value)) return false;
      if (!Array.isArray(schema.fields)) return true;
      const [, ns] = typeof schema.name === 'string' ? getFullname(schema.name, schema.namespace, namespace) : ['', ''];
      return schema.fields.every(field => {
        if (!isPlainObject(field) || typeof field.name !== 'string') return true;
        if (field.name in value) return isValidDefault(value[field.name], field.type, ns, analysis);
        return 'default' in field;
      });
    }

    case 'enum':
      return typeof value === 'string' && (!Array.isArray(schema.symbols) || schema.symbols.includes(value));
    case 'fixed':
      return isByteString(value) && (typeof schema.size !== 'number' || value.length === schema.size);
    case 'array':
      return Array.isArray(value) && value.every(item => isValidDefault(item, schema.items, namespace, analysis));
    case 'map':
      return (
        isPlainObject(value) && Object.values(value).every(v => isValidDefault(v, schema.values, namespace, analysis))
      );
    default: {
      const definition = analysis.resolve(type, namespace);
      return definition === null || isValidDefault(value, definition.schema, definition.namespace, analysis);
    }
  }
}

/** Index of the first union member the value is a valid default for, or -1. */
export function matchingUnionBranch(
  value: unknown,
  union: unknown[],
  namespace: string,
  analysis: AvroAnalysis,
): number {
  return union.findIndex(member => !Array.isArray(member) && isValidDefault(value, member, namespace, analysis));
}

const INT_MIN = -(2 ** 31);
const INT_MAX = 2 ** 31 - 1;

function isByteString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) > 0xff) return false;
  }

  return true;
}

function isValidPrimitive(value: unknown, type: string): boolean {
  switch (type) {
    case 'null':
      return value === null;
    case 'boolean':
      return typeof value === 'boolean';
    case 'int':
      return typeof value === 'number' && Number.isInteger(value) && value >= INT_MIN && value <= INT_MAX;
    case 'long':
      return typeof value === 'number' && Number.isInteger(value);
    case 'float':
    case 'double':
      return typeof value === 'number';
    case 'bytes':
      return isByteString(value);
    case 'string':
      return typeof value === 'string';
    default:
      return true;
  }
}

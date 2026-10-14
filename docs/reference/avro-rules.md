# Avro Rules

Spectral has a built-in "avro" ruleset for [Apache Avro](https://avro.apache.org/docs/1.12.0/specification/) schema declarations, written against the Avro 1.12 specification.

In your ruleset file you can add `extends: "spectral:avro"` and you'll get all of the following rules applied to documents detected as the `avro1` format (any `.avsc` file, or a JSON/YAML document whose root is a named Avro type or a top-level array of Avro schemas).

> Apache Avro does not publish a JSON Schema for `.avsc` files. The structural check in `avro-schema` uses a JSON Schema maintained by Spectral (see `packages/rulesets/src/avro/schemas/avro/v1.12`). The Avro-specific semantics (name resolution, defaults, unions, logical types) are checked by the other rules in this ruleset.

### AsyncAPI and `schemaFormat`

AsyncAPI messages can declare Avro payloads with `schemaFormat`, for example `application/vnd.apache.avro;version=1.9.0`. The `spectral:asyncapi` ruleset checks these payloads with the structural schema and the semantic checks for names, references, defaults, enum symbols, unions and logical types, through [asyncapi-payload-avro](asyncapi-rules.md#asyncapi-payload-avro) for AsyncAPI 2.x and [asyncapi-3-payload-avro](asyncapi-rules.md#asyncapi-3-payload-avro) for AsyncAPI 3.x. The style checks (`avro-union-default-first-member`, `avro-optional-field-null-default` and the doc rules) only run with `spectral:avro`, for example on `.avsc` files.

### avro-schema

Validate the structure of the Avro schema: every schema must be a type name string, a union array or an object with a `type`, records must have `name` and `fields`, enums `name` and `symbols`, arrays `items`, maps `values` and fixed types `name` and a positive integer `size`. Field `order` must be `ascending`, `descending` or `ignore`.

**Recommended:** Yes

**Bad Example**

```json
{ "type": "fixed", "name": "MD5", "size": 0 }
```

### avro-name-valid

Names of named types (record, enum, fixed), field names, enum and field aliases must match `[A-Za-z_][A-Za-z0-9_]*`. Full names and namespaces are dot-separated sequences of such names (an empty namespace means the null namespace). Named types may not redefine a primitive type name.

**Recommended:** Yes

**Bad Example**

```json
{ "type": "record", "name": "user-profile", "fields": [{ "name": "first-name", "type": "string" }] }
```

### avro-name-unique

The full name (namespace plus name) of each named type must be unique within the schema.

**Recommended:** Yes

### avro-type-reference-resolved

A type name that isn't a primitive must refer to a named type that is defined earlier in the schema. Unqualified names are looked up in the enclosing namespace first, then in the null namespace.

**Recommended:** Yes

**Bad Example**

```json
{
  "type": "record",
  "name": "User",
  "namespace": "com.example",
  "fields": [{ "name": "address", "type": "Address" }]
}
```

### avro-field-name-unique

Field names must be unique within a record.

**Recommended:** Yes

### avro-field-default-valid

A field `default` must be a valid JSON encoding of the field's type: `int` within 32-bit range, `long` an integer, `bytes`/`fixed` strings of code points 0-255 (with the exact `size` for fixed), enum defaults one of the symbols, record defaults an object containing every field without its own default, and so on.

For unions, Avro 1.12 accepts a default that matches any member of the union. See `avro-union-default-first-member` for compatibility with older implementations.

**Recommended:** Yes

**Bad Example**

```json
{ "name": "age", "type": "int", "default": "unknown" }
```

### avro-union-default-first-member

Before Avro 1.12, a union field's default had to match the first member of the union, and many implementations still enforce this. This rule warns when the default only matches a later member.

**Recommended:** Yes

**Good Example**

```json
{ "name": "nickname", "type": ["null", "string"], "default": null }
```

**Bad Example**

```json
{ "name": "nickname", "type": ["null", "string"], "default": "bob" }
```

### avro-enum-symbols-valid

Enum symbols must be valid Avro names and unique within the enum. An enum `default` must be one of its symbols.

**Recommended:** Yes

**Bad Example**

```json
{ "type": "enum", "name": "Suit", "symbols": ["SPADES", "SPADES"], "default": "JOKER" }
```

### avro-union-valid

Unions may not contain more than one schema of the same type, except for named types with different full names. Unions also may not immediately contain other unions.

**Recommended:** Yes

**Bad Example**

```json
{ "name": "value", "type": ["null", "string", ["int", "long"], "string"] }
```

### avro-logical-type-valid

Logical types must annotate the correct underlying type:

| Logical type                                                                                                                                          | Underlying type                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `decimal`                                                                                                                                             | `bytes` or `fixed` (with a positive `precision`, `0 <= scale <= precision`, and `precision` that fits the fixed size) |
| `big-decimal`                                                                                                                                         | `bytes`                                                                                                               |
| `uuid`                                                                                                                                                | `string` or `fixed` of size 16                                                                                        |
| `date`, `time-millis`                                                                                                                                 | `int`                                                                                                                 |
| `time-micros`, `timestamp-millis`, `timestamp-micros`, `timestamp-nanos`, `local-timestamp-millis`, `local-timestamp-micros`, `local-timestamp-nanos` | `long`                                                                                                                |
| `duration`                                                                                                                                            | `fixed` of size 12                                                                                                    |

It also flags `logicalType` set on a record field instead of on the field's type. Avro implementations silently ignore an invalid logical type and fall back to the underlying type, so this rule is a warning. Unknown logical types are not reported.

**Recommended:** Yes

**Bad Example**

```json
{ "name": "createdAt", "type": "int", "logicalType": "timestamp-millis" }
```

### avro-optional-field-null-default

Optional fields (a union with `null`) should list `null` as the first member and declare `"default": null`, so that the field can be added or omitted in schema evolution.

**Recommended:** Yes

**Good Example**

```json
{ "name": "email", "type": ["null", "string"], "default": null }
```

**Bad Example**

```json
{ "name": "email", "type": ["string", "null"] }
```

### avro-record-doc

Records (and errors) should have a non-empty `doc`.

**Recommended:** No

### avro-field-doc

Record fields should have a non-empty `doc`.

**Recommended:** No

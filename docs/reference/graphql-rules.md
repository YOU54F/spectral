# GraphQL Rules

Spectral has a built-in "graphql" ruleset for [GraphQL](https://spec.graphql.org/) schemas written in the Schema Definition Language (SDL).

In your ruleset file you can add `extends: "spectral:graphql"` and you'll get all of the following rules applied. The ruleset also registers the GraphQL parser for `.graphql`, `.graphqls` and `.gql` files.

### graphql-type-description

Scalar, object, interface, union, enum and input object types should have a description. Type extensions are not checked. Empty or whitespace-only descriptions count as missing, and results point at the type name.

The other description rules below behave the same way.

**Recommended:** Yes

**Bad Example**

```graphql
type Pet {
  name: String
}
```

**Good Example**

```graphql
"A pet in the store"
type Pet {
  name: String
}
```

### graphql-field-description

Fields of object and interface types, and fields of input object types, should have a description.

**Recommended:** Yes

**Good Example**

```graphql
type Pet {
  "The name of the pet"
  name: String
}
```

### graphql-argument-description

Field arguments and directive arguments should have a description.

**Recommended:** Yes

**Good Example**

```graphql
type Query {
  pet("The id of the pet" id: ID!): Pet
}
```

### graphql-enum-value-description

Enum values should have a description.

**Recommended:** Yes

**Good Example**

```graphql
enum PetStatus {
  "The pet can be adopted"
  AVAILABLE
}
```

### graphql-type-name-pascal-case

Type names should be PascalCase, for example `PetOwner`. They must start with an upper-case letter and contain only letters and digits, so acronyms such as `URL`, `HTTPHeader` or `OAuth2Client` are allowed, but `_Any` and `Pet_Kind` are not.

**Recommended:** Yes

### graphql-field-name-camel-case

Field and argument names should be camelCase, for example `petById(petId: ID!)`.

**Recommended:** Yes

### graphql-enum-value-upper-case

Enum values should be UPPER_CASE, for example `GUINEA_PIG`.

**Recommended:** Yes

### graphql-type-name-unique

Type names must be unique within the document. Type extensions (`extend type Pet`) and directive definitions are not counted.

**Recommended:** Yes

**Bad Example**

```graphql
type Pet {
  id: ID
}

input Pet {
  id: ID
}
```

### graphql-field-name-unique

Field names must be unique within their type, interface or input type. Each definition or extension is checked on its own.

**Recommended:** Yes

**Bad Example**

```graphql
type Pet {
  name: String
  name: String
}
```

### graphql-enum-value-unique

Enum values must be unique within their enum.

**Recommended:** Yes

**Bad Example**

```graphql
enum PetStatus {
  AVAILABLE
  AVAILABLE
}
```

### graphql-directive-name-unique

Directive names must be unique within the document.

**Recommended:** Yes

**Bad Example**

```graphql
directive @auth on FIELD_DEFINITION
directive @auth on OBJECT
```

### graphql-schema-valid

The document must be a valid, standalone GraphQL schema, as checked by [graphql-js](https://github.com/graphql/graphql-js). This reports, for example, unknown types and directives, extensions of undefined types, misplaced directives, output types used as input types, and objects that do not implement their interfaces correctly.

A missing `Query` type is not reported, so partial schemas are fine. The built-in scalars (`String`, `Int`, `Float`, `Boolean` and `ID`) and directives (`@include`, `@skip`, `@deprecated` and `@specifiedBy`) are always known. Documents with operations and fragments but no type definitions or extensions are not checked against a schema, so the types they reference are not reported as unknown; in documents that also define types, operations and fragments may only use the types defined there. Duplicate names are left to the uniqueness rules above. Other directives that are defined elsewhere are reported as unknown. Turn this rule off for schemas that rely on them.

[Apollo Federation](https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/directives) subgraphs don't need to define the federation directives and types they use:

- A subgraph that links to Federation 2 with `@link(url: "https://specs.apollo.dev/federation/v2.x", ...)` on `schema` or `extend schema` may use the directives and types it imports under their imported names (including `as` renames), any others under their namespaced names, such as `@federation__shareable` or `FieldSet` as `federation__FieldSet` (or the `as` namespace of the `@link`), and `@link`, `link__Import`, `link__Purpose`, `_Any` and `_Service`. As with Apollo, a federation directive that isn't imported, such as `@shareable`, is reported as unknown under its short name.
- A subgraph that uses `@key` or `@extends` without such a `@link` is taken to be a Federation 1 subgraph, which may use `@key`, `@external`, `@requires`, `@provides`, `@extends`, `@tag`, `@inaccessible`, `_FieldSet`, `_Any` and `_Service`.

In both cases, types that are only extended, such as `extend type Query { ... }`, are not reported as undefined, and definitions in the document take precedence. Directive versions are not checked. Detection only kicks in for documents that use `@link` to Federation or `@key`/`@extends`, so plain schemas are validated as before. The `graphqlSchemaValid` function takes a `federation: false` option for programmatic use.

**Recommended:** Yes

**Bad Example**

```graphql
type Query {
  pet: Pet
}
```

`Pet` is not defined.

### graphql-deprecated-reason

Items marked with `@deprecated` should explain why, using a non-empty `reason`.

**Recommended:** Yes

**Bad Example**

```graphql
type Pet {
  name: String @deprecated
}
```

**Good Example**

```graphql
type Pet {
  name: String @deprecated(reason: "Use `title` instead.")
}
```

# GraphQL Rules

Spectral has a built-in "graphql" ruleset for [GraphQL](https://spec.graphql.org/) schemas written in the Schema Definition Language (SDL).

In your ruleset file you can add `extends: "spectral:graphql"` and you'll get all of the following rules applied. The ruleset also registers the GraphQL parser for `.graphql`, `.graphqls` and `.gql` files.

### graphql-type-description

Scalar, object, interface, union, enum and input object types should have a description. Type extensions are not checked.

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

Type names should be PascalCase, for example `PetOwner`.

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

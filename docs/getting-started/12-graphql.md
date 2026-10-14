# GraphQL Support

Spectral has a built-in ruleset for [GraphQL](https://spec.graphql.org/) schemas written in the Schema Definition Language (SDL).

Add `extends: "spectral:graphql"` to your ruleset file to apply rules for GraphQL SDL:

```yaml
extends: ["spectral:graphql"]
```

Then lint your schema like any other document:

```bash
spectral lint schema.graphql
```

The ruleset registers a GraphQL parser for files ending in `.graphql`, `.graphqls` or `.gql`, including documents reached through `$ref`. Syntax errors are reported as `parser` errors.

The parser turns the SDL into a plain JSON-like tree, so you can write your own rules with JSONPath. Names and descriptions are plain strings, and every node keeps the `kind` from the [graphql-js](https://github.com/graphql/graphql-js) AST:

```graphql
"A pet"
type Pet {
  name: String
}
```

becomes

```json
{
  "kind": "Document",
  "definitions": [
    {
      "kind": "ObjectTypeDefinition",
      "description": "A pet",
      "name": "Pet",
      "interfaces": [],
      "directives": [],
      "fields": [
        {
          "kind": "FieldDefinition",
          "name": "name",
          "arguments": [],
          "type": { "kind": "NamedType", "name": "String" },
          "directives": []
        }
      ]
    }
  ]
}
```

For example, this rule requires every field of the `Query` type to have a description:

```yaml
extends: ["spectral:graphql"]
rules:
  query-field-description:
    given: "$.definitions[?(@.name === 'Query')].fields[*]"
    then:
      field: description
      function: truthy
```

Use the `graphql` format to target GraphQL documents in your own rules.

You can see a full list of the rules in this ruleset in [GraphQL Rules](../reference/graphql-rules.md).

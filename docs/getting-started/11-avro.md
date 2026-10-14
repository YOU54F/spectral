# Avro Support

Spectral has a built-in [Apache Avro](https://avro.apache.org/docs/1.12.0/specification/) ruleset that you can use to validate Avro schema declarations (`.avsc` files).

Add `extends: "spectral:avro"` to your ruleset file to apply rules for Avro 1.x schemas:

```bash
echo 'extends: ["spectral:avro"]' > .spectral.yaml
spectral lint user.avsc
```

The rules apply to documents detected as the `avro1` format. That means any file with the `.avsc` extension, plus JSON or YAML documents whose root is a named Avro type (a `record`, `error`, `enum` or `fixed` with a `name`) or a top-level array of Avro schemas. Documents that look like JSON Schema, OpenAPI, AsyncAPI or Arazzo are never detected as Avro.

You can see a full list of the rules in this ruleset in [Avro Rules](../reference/avro-rules.md).

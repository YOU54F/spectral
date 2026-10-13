# Arazzo Support

Spectral has a built-in Arazzo ruleset that you can use to validate your Arazzo files. It supports:

- [Arazzo v1.0.x](https://spec.openapis.org/arazzo/v1.0.0.html) (format `arazzo1_0`)
- [Arazzo v1.1.x](https://spec.openapis.org/arazzo/v1.1.0.html) (format `arazzo1_1`)
- Arazzo v1.2.x (format `arazzo1_2`), validated against the unreleased work-in-progress 1.2 schema from the specification's `v1.2-dev` branch. It may change before 1.2 is published.

Add `extends: "spectral:arazzo"` to your ruleset file to apply rules for Arazzo.

The `arazzo` field of your document decides which version of the Arazzo JSON Schema is used by the `arazzo-document-schema` rule. A `1.1.x` document is validated against the Arazzo 1.1 schema, so 1.1 features such as AsyncAPI source descriptions and steps (`channelPath`, `action`, `correlationId`, `timeout`, step-level `dependsOn`) are accepted. The same fields in a `1.0.x` document are reported as errors. A `1.2.x` document may also use WSDL (SOAP) source descriptions (`type: wsdl`) and `operationName` steps.

For Arazzo 1.1 steps, the `arazzo-step-validation` rule also checks that:

- `channelPath` uses the `{$sourceDescriptions.<name>.url}#<json-pointer>` form and points at an `asyncapi` source description.
- `operationName` (Arazzo 1.2) of the form `$sourceDescriptions.<name>.<operation>` points at a `wsdl` source description.
- Each step-level `dependsOn` entry references an existing step: a `stepId` in the same workflow, `$workflows.<workflowId>.steps.<stepId>`, or a known `$sourceDescriptions.<name>` entry.

You can see a full list of the rules in this ruleset in [Arazzo Rules](../reference/arazzo-rules.md).

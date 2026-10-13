# OpenAPI Overlay Rules

Spectral has a built-in "overlay" ruleset for the [OpenAPI Overlay Specification](https://spec.openapis.org/overlay/latest.html), versions 1.0.x, 1.1.x and 1.2.x.

In your ruleset file you can add `extends: "spectral:overlay"` and you'll get all of the following rules applied.

## Limitations

An Overlay document can't be fully validated on its own. Spectral lints the Overlay document only; it doesn't load the document named by `extends`, and it doesn't apply the actions. This means Spectral can't tell you:

- whether a `target` (or `copy`) expression selects anything in the target document, or selects the right kind of node,
- whether an `update` value is a valid fragment of the target document (for instance a valid OpenAPI Schema Object), or
- whether the result of applying the overlay is a valid OpenAPI document.

To check those, apply the overlay with an Overlay tool and lint the resulting document with the [OpenAPI ruleset](./openapi-rules.md).

`$ref`s inside `update` values usually refer to the target document (for example `#/components/schemas/Pet`). Spectral always resolves references relative to the document being linted, so it reports `invalid-ref` errors for references that only exist in the target document. This is a known limitation; if it gets in your way, you can provide a [custom resolver](../guides/3-javascript.md#how-to-use-a-custom-resolver) (`--resolver` in the CLI). The Overlay rules themselves always look at the unresolved document.

## Rules

### overlay-document-schema

Validate the structure of an Overlay document against the official JSON Schema of its Overlay version (1.0, 1.1 or 1.2).

**Recommended:** Yes

### overlay-info-title

The `info` object must have a non-empty `title`.

**Recommended:** Yes

### overlay-info-version

The `info` object must have a non-empty `version` (the version of the Overlay document, not of the Overlay Specification).

**Recommended:** Yes

### overlay-info-description

The `info` object should have a non-empty `description`. Only applies to Overlay 1.1 and later, which added this field.

**Recommended:** Yes

### overlay-actions-non-empty

An Overlay must have at least one action.

**Recommended:** Yes

### overlay-action-target-jsonpath

Every action `target` must be a syntactically valid [RFC 9535](https://www.rfc-editor.org/rfc/rfc9535) JSONPath query expression.

This rule only checks syntax (including the well-typedness of the standard `length()`, `count()`, `match()`, `search()` and `value()` functions); it doesn't check that the query selects anything. Non-standard syntax supported by some JSONPath libraries, such as JSONPath-Plus script filters (`$[?(@property === 'x')]`) or the parent operator (`^`), is reported as invalid, as are function extensions that aren't defined by RFC 9535.

**Recommended:** Yes

**Good Example**

```yaml
actions:
  - target: "$.paths.*[?@.tags && length(@.tags) > 1]"
    remove: true
```

**Bad Example**

```yaml
actions:
  - target: "$.paths.*[?(@property === 'get')]"
    remove: true
```

### overlay-action-copy-jsonpath

Every action `copy` (Overlay 1.1+), including `copy` fields of Overlay 1.2 reusable actions, must be a syntactically valid RFC 9535 JSONPath query expression. The same caveats as for [overlay-action-target-jsonpath](#overlay-action-target-jsonpath) apply.

**Recommended:** Yes

### overlay-action-single-operation

An action should perform exactly one operation:

- Overlay 1.0: either `update` or `remove: true`. `update` has no effect when `remove` is `true`.
- Overlay 1.1+: one of `update`, `copy` or `remove: true`. `update` has no effect when `remove` is `true` or `copy` is set, and `copy` has no effect when `remove` is `true` or `update` is set.

Actions that perform no operation at all are reported too. Overlay 1.2 actions that reference a reusable action (`$ref`) are skipped.

**Recommended:** Yes

**Bad Example**

```yaml
actions:
  - target: "$.info"
    update:
      title: New title
    remove: true
```

### overlay-action-remove-boolean

`remove` must be a boolean.

**Recommended:** Yes

### overlay-extends-uri

`extends` must be a valid URI reference. In Overlay 1.2 it must not contain a fragment.

**Recommended:** Yes

### overlay-action-description

Actions should have a non-empty `description` explaining what they do.

**Recommended:** Yes

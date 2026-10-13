# OpenRPC Rules

Spectral has a built-in "openrpc" ruleset for the [OpenRPC Specification](https://spec.open-rpc.org/), which describes [JSON-RPC 2.0](https://www.jsonrpc.org/specification) APIs.

In your ruleset file you can add `extends: "spectral:openrpc"` and you'll get all of the following rules applied. The ruleset applies to documents in the `openrpc1` format, i.e. documents with an `openrpc` field of `1.x.y` (including the `1.0.0-rcN` release candidates).

> **JSON-RPC and MCP:** the [Model Context Protocol](https://modelcontextprotocol.io/) also uses JSON-RPC 2.0 messages, so rules such as `openrpc-error-code-reserved` and `openrpc-method-name-reserved` follow the same JSON-RPC conventions MCP servers use. This ruleset only lints OpenRPC documents, though. It does not validate MCP server definitions or MCP traffic.

### openrpc-schema

Validate the structure of an OpenRPC document against the official OpenRPC meta-schema. Documents with `openrpc` 1.0.0-rc0 to 1.3.x are checked against the 1.3 meta-schema, and 1.4.x documents against the 1.4 meta-schema.

**Recommended:** Yes

### openrpc-info-title

The `info` object must have a non-empty `title`.

**Recommended:** Yes

### openrpc-info-version

The `info` object must have a non-empty `version`.

**Recommended:** Yes

### openrpc-info-description

The `info` object should have a `description`.

**Recommended:** Yes

### openrpc-method-name-unique

Method names must be unique within the document.

**Recommended:** Yes

**Bad Example**

```yaml
methods:
  - name: list_pets
    params: []
    result: { name: pets, schema: { type: array } }
  - name: list_pets
    params: []
    result: { name: pets, schema: { type: array } }
```

### openrpc-method-name-reserved

JSON-RPC reserves method names that begin with `rpc.` for internal methods and extensions. The only exception is `rpc.discover`, which OpenRPC defines as its service discovery method.

**Recommended:** Yes

**Bad Example**

```yaml
methods:
  - name: rpc.list_pets
```

### openrpc-method-description

A method should have a `summary` or a `description`.

**Recommended:** Yes

### openrpc-method-tags

A method should have a non-empty `tags` array.

**Recommended:** Yes

### openrpc-method-result

A method should have a `result`. A method without a `result` can only be called as a JSON-RPC notification. If a method is meant to be a notification, turn this rule off for it with an [override](../guides/4d-overrides.md).

**Recommended:** Yes

### openrpc-param-name-unique

Param names must be unique within a method.

**Recommended:** Yes

### openrpc-param-required-order

Required params must come before optional params. Params can be passed by position, so a required param after an optional one cannot be supplied without also supplying the optional one.

**Recommended:** Yes

**Good Example**

```yaml
params:
  - name: id
    required: true
    schema: { type: integer }
  - name: verbose
    schema: { type: boolean }
```

**Bad Example**

```yaml
params:
  - name: verbose
    schema: { type: boolean }
  - name: id
    required: true
    schema: { type: integer }
```

### openrpc-param-structure

`paramStructure` must be one of `by-position`, `by-name` or `either`.

**Recommended:** Yes

### openrpc-ref-target

Every local `$ref` must resolve, and it must point to the matching `#/components` section. For example, a param must reference `#/components/contentDescriptors/...`, an error must reference `#/components/errors/...`, and an example pairing must reference `#/components/examplePairings/...`.

**Recommended:** Yes

**Bad Example**

```yaml
methods:
  - name: get_pet
    params:
      - $ref: "#/components/schemas/PetId"
```

### openrpc-error-code-unique

Error codes must be unique within a method.

**Recommended:** Yes

### openrpc-error-code-reserved

JSON-RPC reserves error codes from -32768 to -32000. Only the pre-defined codes (-32700 and -32600 to -32603) and the implementation-defined server error range (-32099 to -32000) may be used from that range.

**Recommended:** Yes

**Good Example**

```yaml
errors:
  - code: 100
    message: Pet not found
  - code: -32602
    message: Invalid params
```

**Bad Example**

```yaml
errors:
  - code: -32500
    message: Pet not found
```

### openrpc-example-pairing-params

Example pairings must match the method:

- every example param must refer to a param of the method
- every required param must be present
- a `result` may only be given if the method has a `result`

**Recommended:** Yes

### openrpc-example-values

An example `value` must be valid against the schema of the matching param or result.

**Recommended:** Yes

**Bad Example**

```yaml
methods:
  - name: get_pet
    params:
      - name: id
        required: true
        schema: { type: integer }
    result:
      name: pet
      schema: { type: object }
    examples:
      - name: get a pet
        params:
          - name: id
            value: "one"
        result:
          name: pet
          value: { name: Rex }
```

### openrpc-server-url

A server `url` must be a valid, possibly relative, URL once its variables are replaced by their defaults. Every `{variable}` in the URL must be defined in `variables`, every defined variable must be used, and a variable's `default` must be one of its `enum` values.

**Recommended:** Yes

**Good Example**

```yaml
servers:
  - name: main
    url: https://{env}.example.com/rpc
    variables:
      env:
        default: api
        enum: [api, staging]
```

**Bad Example**

```yaml
servers:
  - name: main
    url: https://{env}.example.com/{version}
```

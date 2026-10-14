# OpenRPC meta-schemas

The JSON files here are vendored, unmodified apart from Prettier formatting (the parsed JSON is identical to upstream).

| File                            | Source                                                                                                                  | Version / pin                                                                                | License    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- |
| `openrpc/v1.3/schema.json`      | [open-rpc/spec](https://github.com/open-rpc/spec), npm `@open-rpc/spec` `dist/1_3`                                      | `@open-rpc/spec@1.4.1` (git tag `v1.4.1`, commit `3a13c7a8bad248e6edd2d48339cd1c06b57f8f22`) | Apache-2.0 |
| `openrpc/v1.4/schema.json`      | [open-rpc/spec](https://github.com/open-rpc/spec), npm `@open-rpc/spec` `dist/1_4`                                      | `@open-rpc/spec@1.4.1` (git tag `v1.4.1`, commit `3a13c7a8bad248e6edd2d48339cd1c06b57f8f22`) | Apache-2.0 |
| `json-schema-tools/schema.json` | [json-schema-tools/meta-schema](https://github.com/json-schema-tools/meta-schema), npm `@json-schema-tools/meta-schema` | `@json-schema-tools/meta-schema@1.8.0`                                                       | Apache-2.0 |

npm integrity:

- `@open-rpc/spec@1.4.1`: `sha512-XoCq9X7FDv2kXz7nK8JZMDtUrGPRyDwbt7HsZRuBtvqzxAyma/c6t33vlCyxEePxMb4aGfX3MJbI2gz9JIqNvg==`
- `@json-schema-tools/meta-schema@1.8.0`: `sha512-pbRAbHidPTf96LhmHXA6bl4D4tz4HrwjZ7A5ConcLFPdCj+93GhsCCFsq+AWti4VOs+9QTezX5l0zLNA+TZv1g==`

The `1.3` schema covers OpenRPC `1.0.0-rc0` up to `1.3.x`; the `1.4` schema covers `1.4.x`.
The older `open-rpc/meta-schema` repository is deprecated in favour of `open-rpc/spec`.

`scripts/compile-schemas.ts` compiles these into `validators.ts` (generated, not committed). At compile time it:

- gives the two OpenRPC schemas distinct `$id`s (upstream both use `https://meta.open-rpc.org/`),
- registers the JSON Schema meta-schema under `https://meta.json-schema.tools` as well (the OpenRPC schemas reference it without a trailing slash),
- rewrites `oneOf: [<object>, <reference object>]` and `oneOf: [<boolean>, <schema>]` into equivalent `if`/`then`/`else`, so validation errors point at the actual problem instead of every `oneOf` branch.

To update, replace the JSON files with the ones from a newer release and update this table.

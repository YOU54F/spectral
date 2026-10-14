# OpenRPC Support

Spectral has a built-in [OpenRPC v1](https://spec.open-rpc.org/) ruleset that you can use to validate your OpenRPC documents, which describe [JSON-RPC 2.0](https://www.jsonrpc.org/specification) APIs.

Add `extends: "spectral:openrpc"` to your ruleset file to apply rules for OpenRPC v1:

```yaml
extends: ["spectral:openrpc"]
```

Documents are detected through the `openrpc` field, so any released 1.x version (`1.0.0-rc0` through `1.4.x`) is linted. Use the `openrpc1` format to target OpenRPC documents in your own rules.

You can see a full list of the rules in this ruleset in [OpenRPC Rules](../reference/openrpc-rules.md).

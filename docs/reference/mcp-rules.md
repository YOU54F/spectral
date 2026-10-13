# MCP Rules

Spectral has a built-in "mcp" ruleset for [MCP registry](https://github.com/modelcontextprotocol/registry) `server.json` files.

In your ruleset file you can add `extends: "spectral:mcp"` and you'll get all of the following rules applied to documents in the `mcpServer` format.

The rules check the official [server.json schema](https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json) and the extra checks the MCP registry runs when you publish a server.

### mcp-server-schema

Validate the structure of `server.json` against the official MCP server.json JSON Schema (2025-12-11).

**Recommended:** Yes

### mcp-server-schema-required

`$schema` must be set. The MCP registry rejects `server.json` files without it.

**Recommended:** Yes

### mcp-server-schema-version

If `$schema` is set, it should reference the current server.json schema (`https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json`). An older or unrecognised schema date is a warning.

**Recommended:** Yes

### mcp-server-name

`name` must be in reverse-DNS `namespace/name` form, with exactly one `/`, and the namespace must look like a reverse domain name (for example `io.github.username`).

**Recommended:** Yes

**Good Example**

```json
{ "name": "io.github.acme/weather" }
```

**Bad Example**

```json
{ "name": "weather" }
```

### mcp-server-version-semver

The server `version` should follow [semantic versioning](https://semver.org/).

**Recommended:** Yes

### mcp-version-not-latest

The server version and package versions must be specific. `latest` is not allowed.

**Recommended:** Yes

### mcp-version-not-range

The server version and package versions must not be version ranges such as `^1.2.3`, `>=1.0.0`, `1.x` or `1.0.0 - 2.0.0`.

**Recommended:** Yes

### mcp-server-description

The server should have a non-empty `description`.

**Recommended:** Yes

### mcp-server-title

If `title` is set, it must not be blank.

**Recommended:** Yes

### mcp-server-packages-or-remotes

A server should define at least one entry in `packages` or `remotes`, or clients won't know how to run or connect to it.

**Recommended:** Yes

### mcp-package-identifier

A package `identifier` must not contain whitespace.

**Recommended:** Yes

### mcp-package-registry-type

A package `registryType` should be one that the MCP registry supports: `npm`, `pypi`, `oci`, `nuget`, `mcpb` or `cargo`.

**Recommended:** Yes

### mcp-package-mcpb-file-sha256

Packages with `registryType: mcpb` must set `fileSha256` so clients can verify the download.

**Recommended:** Yes

### mcp-package-runtime-hint

Packages with `runtimeArguments` should set `runtimeHint` (for example `npx` or `uvx`), so clients know which runtime the arguments are for.

**Recommended:** Yes

### mcp-package-transport

A package `transport` must match its type. A `stdio` transport must not have a `url`, and `streamable-http` and `sse` transports must have one. Any `{variables}` in the URL must be defined by the package's environment variables or arguments.

**Recommended:** Yes

**Bad Example**

```json
{
  "transport": { "type": "streamable-http", "url": "http://localhost:{port}/mcp" }
}
```

In this example, `{port}` is not defined by any environment variable or argument.

### mcp-remote-url

Remote URLs must be valid, public `https` URLs. They must not point at `localhost`, and any `{variables}` must be defined in the remote's `variables`.

**Recommended:** Yes

**Good Example**

```json
{
  "remotes": [{ "type": "streamable-http", "url": "https://mcp.example.com/mcp" }]
}
```

**Bad Example**

```json
{
  "remotes": [{ "type": "sse", "url": "http://localhost:8080/sse" }]
}
```

### mcp-named-argument

A named argument's `name` must not contain spaces, `<`, `>` or `$`. Its `value` and `default` must not repeat the name, because clients add the name for you. For example, use `"name": "--port", "value": "8080"` rather than `"value": "--port 8080"`.

**Recommended:** Yes

### mcp-secret-input

Environment variables, arguments, headers and URL variables whose names look like credentials (for example `API_KEY`, `GITHUB_TOKEN` or `Authorization`) should set `isSecret: true`. They must not hard-code a `value` or `default` unless it is a `{placeholder}`.

**Recommended:** Yes

**Good Example**

```json
{
  "environmentVariables": [{ "name": "API_KEY", "isRequired": true, "isSecret": true }]
}
```

**Bad Example**

```json
{
  "environmentVariables": [{ "name": "API_KEY", "default": "sk-123456" }]
}
```

This rule is a warning by default, because the name matching can flag inputs that are not secrets. To make it an error, override it in your own ruleset:

```yaml
extends: ["spectral:mcp"]
rules:
  mcp-secret-input: error
```

### mcp-repository-url

`repository.url` must match `repository.source`. GitHub and GitLab URLs must be in the `https://github.com/owner/repo` or `https://gitlab.com/group/repo` form. Other sources must use an `https` URL.

**Recommended:** Yes

### mcp-repository-subfolder

`repository.subfolder` must be a clean relative path, such as `src/server`. It must not have a leading or trailing `/`, or any `.` or `..` segments.

**Recommended:** Yes

### mcp-urls-https

`websiteUrl` and icon `src` URLs must be absolute `https` URLs.

**Recommended:** Yes

### mcp-meta-publisher-provided

The MCP registry only keeps `_meta` under `io.modelcontextprotocol.registry/publisher-provided`, and only up to 4KB. Other `_meta` keys are dropped when you publish.

**Recommended:** Yes

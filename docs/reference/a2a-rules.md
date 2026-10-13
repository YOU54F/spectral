# A2A Agent Card Rules

Spectral has a built-in "a2a" ruleset for [A2A (Agent2Agent) protocol](https://a2a-protocol.org/latest/specification/) Agent Cards.

In your ruleset file you can add `extends: "spectral:a2a"` and you'll get all of the following rules applied.

The ruleset supports the two released Agent Card shapes:

| Version | Detected by                                                               | Schema                                                                  |
| ------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| v1.0.x  | `supportedInterfaces` array                                               | [A2A v1.0.1 `AgentCard`](https://a2a-protocol.org/v1.0.1/spec/a2a.json) |
| v0.3.x  | top-level `url` and `protocolVersion` of `0.3` (no `supportedInterfaces`) | [A2A v0.3.0 `AgentCard`](https://github.com/a2aproject/A2A/tree/v0.3.0) |

Cards that predate v0.3 (for example `protocolVersion: "0.2.5"`) are recognized, but are not validated against a schema; `a2a-protocol-version` reports them as unsupported.

The main differences between v0.3 and v1.0 Agent Cards are:

- `url`, `preferredTransport`, `additionalInterfaces` and the top-level `protocolVersion` were replaced by `supportedInterfaces[]`, where every interface has its own `url`, `protocolBinding` and `protocolVersion` (and an optional `tenant`).
- `supportsAuthenticatedExtendedCard` moved to `capabilities.extendedAgentCard`, and `capabilities.stateTransitionHistory` was removed.
- `security` (`{ "<scheme>": ["scope"] }`) became `securityRequirements` (`{ "schemes": { "<scheme>": { "list": ["scope"] } } }`).
- Security schemes are no longer discriminated by `type`: each scheme wraps exactly one of `apiKeySecurityScheme`, `httpAuthSecurityScheme`, `oauth2SecurityScheme`, `openIdConnectSecurityScheme` or `mtlsSecurityScheme`. API keys use `location` instead of `in`.

### a2a-agent-card-schema

Validate the structure of an Agent Card against the A2A Agent Card schema for its version (v1.0 or v0.3).

**Recommended:** Yes

**Bad Example**

```json
{
  "name": "Recipe Agent",
  "supportedInterfaces": [{ "url": "https://agent.example.com/a2a/v1", "protocolVersion": "1.0" }],
  "capabilities": {},
  "skills": []
}
```

The card is missing `description`, `version`, `defaultInputModes` and `defaultOutputModes`, and the interface is missing `protocolBinding`.

### a2a-protocol-version

The Agent Card must declare a supported A2A protocol version (`0.3` or `1.0`). Versions should be written as `Major.Minor`; patch versions should not be used.

In v1.0 cards the version is declared per entry of `supportedInterfaces`; in v0.3 cards it's the top-level `protocolVersion`.

**Recommended:** Yes

**Good Example**

```json
{
  "supportedInterfaces": [{ "url": "https://agent.example.com/a2a/v1", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }]
}
```

**Bad Example**

```json
{
  "supportedInterfaces": [{ "url": "https://agent.example.com/a2a/v1", "protocolBinding": "JSONRPC", "protocolVersion": "1.0.1" }]
}
```

### a2a-protocol-binding

Agent interfaces should use one of the core A2A protocol bindings: `JSONRPC`, `GRPC` or `HTTP+JSON`. Custom bindings are allowed by the specification, so this rule is informational.

Applies to `supportedInterfaces[*].protocolBinding` (v1.0) and `preferredTransport` / `additionalInterfaces[*].transport` (v0.3).

**Recommended:** Yes

**Bad Example**

```json
{
  "supportedInterfaces": [{ "url": "https://agent.example.com/a2a/v1", "protocolBinding": "jsonrpc", "protocolVersion": "1.0" }]
}
```

### a2a-https-urls

Production deployments must use encrypted communication. Agent Card URLs (interfaces, provider, documentation, icon and OAuth 2.0 / OpenID Connect endpoints) should use `https://` (or `wss://`). Plain `http://` and `ws://` URLs are only accepted for loopback hosts (`localhost`, `127.0.0.1`, `[::1]`).

**Recommended:** Yes

**Good Example**

```json
{
  "supportedInterfaces": [{ "url": "https://agent.example.com/a2a/v1", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }]
}
```

**Bad Example**

```json
{
  "supportedInterfaces": [{ "url": "http://agent.example.com/a2a/v1", "protocolBinding": "JSONRPC", "protocolVersion": "1.0" }]
}
```

### a2a-skill-id-unique

Every skill must have a unique `id`.

**Recommended:** Yes

**Bad Example**

```json
{
  "skills": [
    { "id": "recipe-search", "name": "Recipe search", "description": "Finds recipes.", "tags": ["cooking"] },
    { "id": "recipe-search", "name": "Recipe planner", "description": "Plans meals.", "tags": ["cooking"] }
  ]
}
```

### a2a-agent-name-description

The Agent Card should have a non-empty `name` and `description`, so that clients and users can understand what the agent does.

**Recommended:** Yes

### a2a-skill-name-description

Every skill should have a non-empty `name` and `description`.

**Recommended:** Yes

### a2a-skill-tags

Every skill should have at least one entry in `tags`, to help clients discover it.

**Recommended:** Yes

### a2a-skill-examples

Every skill should provide at least one example prompt or scenario in `examples`.

**Recommended:** Yes

**Good Example**

```json
{
  "id": "recipe-search",
  "name": "Recipe search",
  "description": "Finds recipes by ingredient or cuisine.",
  "tags": ["cooking"],
  "examples": ["Find me a vegetarian lasagne recipe"]
}
```

### a2a-security-requirements-defined

Every security scheme referenced by a security requirement, on the card or on a skill, must be declared in `securitySchemes`.

Applies to `securityRequirements` (v1.0) and `security` (v0.3).

**Recommended:** Yes

**Bad Example**

```json
{
  "securitySchemes": {
    "bearer": { "httpAuthSecurityScheme": { "scheme": "Bearer" } }
  },
  "securityRequirements": [{ "schemes": { "oauth": { "list": ["read"] } } }]
}
```

### a2a-media-types

Entries in `defaultInputModes`, `defaultOutputModes` and each skill's `inputModes` / `outputModes` should be valid media types (`type/subtype`, optionally with parameters).

**Recommended:** Yes

**Good Example**

```json
{
  "defaultInputModes": ["text/plain", "application/json", "image/*"]
}
```

**Bad Example**

```json
{
  "defaultInputModes": ["text"]
}
```

### a2a-provider

The Agent Card should identify the organization that provides the agent in `provider`.

**Recommended:** Yes

**Good Example**

```json
{
  "provider": {
    "organization": "Example Org",
    "url": "https://example.com"
  }
}
```

### a2a-capabilities

Agent capabilities should be consistent:

- An agent that serves an authenticated extended Agent Card (`capabilities.extendedAgentCard` in v1.0, `supportsAuthenticatedExtendedCard` in v0.3) must declare the `securitySchemes` clients use to authenticate.
- `capabilities.extensions[*].uri` should be unique.
- v0.3 cards should use `supportsAuthenticatedExtendedCard` rather than the v1.0 `capabilities.extendedAgentCard`.

**Recommended:** Yes

**Bad Example**

```json
{
  "capabilities": { "extendedAgentCard": true }
}
```

The card advertises an extended Agent Card, but declares no `securitySchemes`.

### a2a-api-key-location

API key security schemes in v1.0 cards must use a `location` of `query`, `header` or `cookie`. (In v0.3 cards the equivalent `in` field is checked by `a2a-agent-card-schema`.)

**Recommended:** Yes

**Bad Example**

```json
{
  "securitySchemes": {
    "key": { "apiKeySecurityScheme": { "name": "X-API-Key", "location": "body" } }
  }
}
```

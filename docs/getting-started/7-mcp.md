# MCP Server Support

Spectral has a built-in ruleset for [MCP registry](https://github.com/modelcontextprotocol/registry) `server.json` files, which describe how to install and connect to a Model Context Protocol server.

Add `extends: "spectral:mcp"` to your ruleset file to apply rules to `server.json` files. Documents are detected as the `mcpServer` format through their `$schema` URL (`https://static.modelcontextprotocol.io/schemas/<date>/server.schema.json`), or, when `$schema` is missing, by a reverse-DNS `name` combined with `version` and `packages` or `remotes`.

You can see a full list of the rules in this ruleset in [MCP Rules](../reference/mcp-rules.md).

# MCP server.json schema (2025-12-11)

`server.schema.json` is vendored verbatim (byte-for-byte, not reformatted) from the
[Model Context Protocol registry](https://github.com/modelcontextprotocol/registry):

- Source: https://github.com/modelcontextprotocol/registry/blob/69374b08deb479d65028236405683c94d67280fc/internal/validators/schemas/2025-12-11.json
- Pinned commit: `69374b08deb479d65028236405683c94d67280fc` (2026-08-10, "docs: add cargo and crates.io to schema examples (#1511)"), the latest commit touching this file as of 2026-10-13
- SHA-256: `2e1e2dc758185bfc91023df4e5ace0e1c1bdb7b7b3d6614bb9ac6b9e9a9c2f68`
- `$id`: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json

This is the copy the registry itself embeds for validation. Compared with the file published at the `$id` URL it
only adds `cargo`/`crates.io` examples and a `maxLength: 255` on `Package.version`.

To update, download the new file from the registry repository, record the new commit and checksum here, and run
`yarn compile-schemas` in `packages/rulesets` to regenerate `../../validators.ts`.

The MCP project is licensed under Apache-2.0 / MIT (see `LICENSE`).

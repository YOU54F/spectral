# OpenAPI Overlay Support

Spectral has a built-in [OpenAPI Overlay](https://spec.openapis.org/overlay/latest.html) ruleset that you can use to validate your Overlay documents. Overlay [v1.0](https://spec.openapis.org/overlay/v1.0.0.html), [v1.1](https://spec.openapis.org/overlay/v1.1.0.html) and [v1.2](https://spec.openapis.org/overlay/v1.2.0.html) are supported, and documents are detected by their `overlay` field.

Add `extends: "spectral:overlay"` to your ruleset file to apply rules for OpenAPI Overlay v1.

Spectral validates the Overlay document on its own: it does not apply the overlay, and it does not check that the action targets match anything in the document being overlaid. See [OpenAPI Overlay Rules](../reference/overlay-rules.md) for the full list of rules and their limitations.

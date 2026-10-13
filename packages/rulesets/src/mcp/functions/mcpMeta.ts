import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

export const PUBLISHER_PROVIDED_KEY = 'io.modelcontextprotocol.registry/publisher-provided';
const MAX_PUBLISHER_PROVIDED_BYTES = 4096;

function byteLength(value: string): number {
  // TextEncoder is available in browsers and Node.js alike.
  return new TextEncoder().encode(value).length;
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpMeta(meta, _opts, { path: basePath }) {
    const results: IFunctionResult[] = [];

    for (const key of Object.keys(meta)) {
      if (key !== PUBLISHER_PROVIDED_KEY) {
        results.push({
          message: `"_meta" key "${key}" is not preserved by the MCP registry; only "${PUBLISHER_PROVIDED_KEY}" is kept.`,
          path: [...basePath, key],
        });
      }
    }

    const publisherProvided = meta[PUBLISHER_PROVIDED_KEY];
    if (publisherProvided !== void 0 && byteLength(JSON.stringify(publisherProvided)) > MAX_PUBLISHER_PROVIDED_BYTES) {
      results.push({
        message: `"${PUBLISHER_PROVIDED_KEY}" must not exceed ${MAX_PUBLISHER_PROVIDED_BYTES} bytes when serialized.`,
        path: [...basePath, PUBLISHER_PROVIDED_KEY],
      });
    }

    return results;
  },
);

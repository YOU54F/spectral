import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';

import { isSafeHttpsUrl } from './utils/urlTemplate';

// Mirrors the repository URL patterns accepted by the MCP registry.
const REPOSITORY_URL_PATTERNS: Record<string, RegExp> = {
  github: /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/,
  gitlab: /^https?:\/\/(www\.)?gitlab\.com\/[\w.-]+\/[\w.-]+\/?$/,
};

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpRepository(repository, _opts, { path: basePath }) {
    const { url, source } = repository;
    if (typeof url !== 'string' || url.length === 0) return;

    const results: IFunctionResult[] = [];
    const path = [...basePath, 'url'];
    const sourcePattern = typeof source === 'string' ? REPOSITORY_URL_PATTERNS[source] : void 0;

    if (sourcePattern !== void 0) {
      if (!sourcePattern.test(url)) {
        results.push({
          message: `Repository URL must point to a ${String(source)} repository (e.g. "https://${String(
            source,
          )}.com/owner/repo"), without a ".git" suffix or extra path segments.`,
          path,
        });
      }
    } else if (!isSafeHttpsUrl(url)) {
      results.push({
        message: 'Repository URL must be an absolute https URL.',
        path,
      });
    }

    return results;
  },
);

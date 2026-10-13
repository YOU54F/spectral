import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

function hasSecuritySchemes(card: Record<string, unknown>): boolean {
  return isPlainObject(card.securitySchemes) && Object.keys(card.securitySchemes).length > 0;
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function a2aCapabilities(card) {
    const results: IFunctionResult[] = [];
    const capabilities = isPlainObject(card.capabilities) ? card.capabilities : {};
    const isV1 = Array.isArray(card.supportedInterfaces);

    // 1.0 moved `supportsAuthenticatedExtendedCard` to `capabilities.extendedAgentCard`.
    if (!isV1 && 'extendedAgentCard' in capabilities) {
      results.push({
        message:
          '"capabilities.extendedAgentCard" is an A2A 1.0 field; 0.3 Agent Cards use "supportsAuthenticatedExtendedCard".',
        path: ['capabilities', 'extendedAgentCard'],
      });
    }

    const extendedCardPath = isV1
      ? capabilities.extendedAgentCard === true
        ? ['capabilities', 'extendedAgentCard']
        : null
      : card.supportsAuthenticatedExtendedCard === true
        ? ['supportsAuthenticatedExtendedCard']
        : null;

    // The extended Agent Card MUST be served to authenticated clients only, using the schemes in the public card.
    if (extendedCardPath !== null && !hasSecuritySchemes(card)) {
      results.push({
        message:
          'An extended Agent Card requires authentication, but the Agent Card does not declare any "securitySchemes".',
        path: extendedCardPath,
      });
    }

    if (Array.isArray(capabilities.extensions)) {
      const seen = new Set<string>();
      capabilities.extensions.forEach((extension, index) => {
        if (!isPlainObject(extension) || typeof extension.uri !== 'string') return;

        if (seen.has(extension.uri)) {
          results.push({
            message: `Extension "uri" must be unique. "${extension.uri}" is duplicated.`,
            path: ['capabilities', 'extensions', index, 'uri'],
          });
        } else {
          seen.add(extension.uri);
        }
      });
    }

    return results;
  },
);

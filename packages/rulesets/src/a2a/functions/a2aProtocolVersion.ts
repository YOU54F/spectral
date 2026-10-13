import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

// Released A2A protocol versions this ruleset understands, as "Major.Minor".
const SUPPORTED_VERSIONS = ['0.3', '1.0'];
const PRINTED_VERSIONS = SUPPORTED_VERSIONS.map(version => `"${version}"`).join(', ');

const VERSION = /^(\d+)\.(\d+)(?:\.(\d+))?$/;

function checkInterfaceVersion(value: unknown, path: (string | number)[], results: IFunctionResult[]): void {
  if (typeof value !== 'string') return;

  const match = VERSION.exec(value);
  const majorMinor = match === null ? null : `${match[1]}.${match[2]}`;

  if (majorMinor === null || !SUPPORTED_VERSIONS.includes(majorMinor)) {
    results.push({
      message: `Unrecognised A2A protocol version "${value}". Expected one of: ${PRINTED_VERSIONS}.`,
      path,
    });
  } else if (match?.[3] !== void 0) {
    results.push({
      message: `Protocol version should be "Major.Minor" ("${majorMinor}"); patch versions should not be used.`,
      path,
    });
  }
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function a2aProtocolVersion(card) {
    const results: IFunctionResult[] = [];

    // 1.0+: every interface declares the protocol version it exposes.
    if (Array.isArray(card.supportedInterfaces)) {
      card.supportedInterfaces.forEach((agentInterface, index) => {
        if (!isPlainObject(agentInterface)) return;
        checkInterfaceVersion(
          agentInterface.protocolVersion,
          ['supportedInterfaces', index, 'protocolVersion'],
          results,
        );
      });

      return results;
    }

    // <= 0.3: a single top-level protocolVersion.
    const { protocolVersion } = card;
    if (protocolVersion === void 0) {
      return [
        {
          message:
            'Agent Card must declare its A2A protocol version via "supportedInterfaces" (1.0) or "protocolVersion" (0.3).',
          path: [],
        },
      ];
    }

    if (typeof protocolVersion !== 'string') return;

    const match = VERSION.exec(protocolVersion);
    const majorMinor = match === null ? null : `${match[1]}.${match[2]}`;

    if (majorMinor === '0.3') return;

    results.push({
      message:
        majorMinor === '1.0'
          ? 'A2A 1.0 Agent Cards declare protocol versions per interface in "supportedInterfaces" instead of a top-level "protocolVersion".'
          : `Unrecognised or unsupported A2A protocol version "${protocolVersion}". Expected one of: ${PRINTED_VERSIONS}.`,
      path: ['protocolVersion'],
    });

    return results;
  },
);

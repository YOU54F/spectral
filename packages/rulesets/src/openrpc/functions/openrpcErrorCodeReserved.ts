import { createRulesetFunction } from '@stoplight/spectral-core';

// JSON-RPC 2.0 reserves -32768 to -32000 (inclusive) for pre-defined errors.
const RESERVED_MIN = -32768;
const RESERVED_MAX = -32000;

// Codes that may be documented: the pre-defined errors and the implementation-defined server errors.
const PREDEFINED = new Set([-32700, -32600, -32601, -32602, -32603]);
const SERVER_ERROR_MIN = -32099;
const SERVER_ERROR_MAX = -32000;

export function isReservedErrorCode(code: number): boolean {
  if (code < RESERVED_MIN || code > RESERVED_MAX) return false;
  if (PREDEFINED.has(code)) return false;
  return code < SERVER_ERROR_MIN || code > SERVER_ERROR_MAX;
}

export default createRulesetFunction<unknown, null>(
  {
    input: null,
    options: null,
  },
  function openrpcErrorCodeReserved(targetVal) {
    if (typeof targetVal !== 'number' || !Number.isInteger(targetVal)) return;

    if (isReservedErrorCode(targetVal)) {
      return [
        {
          message: `Error code "${targetVal}" is in the range reserved by JSON-RPC (-32768 to -32000) and is not a pre-defined or server error code.`,
        },
      ];
    }

    return;
  },
);

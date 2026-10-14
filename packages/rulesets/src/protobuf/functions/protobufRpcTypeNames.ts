import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufService } from '@stoplight/spectral-parsers';

import { lastSegment } from './utils';

// Like Buf's RPC_REQUEST_STANDARD_NAME and RPC_RESPONSE_STANDARD_NAME: <Rpc>Request or <Service><Rpc>Request.
export default createRulesetFunction<ProtobufService, null>(
  {
    input: null,
    options: null,
  },
  function protobufRpcTypeNames(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    if (!Array.isArray(targetVal.rpcs)) return results;

    targetVal.rpcs.forEach((rpc, i) => {
      for (const [property, suffix] of [
        ['requestType', 'Request'],
        ['responseType', 'Response'],
      ] as const) {
        const type = lastSegment(rpc[property]);
        const expected = `${rpc.name}${suffix}`;
        if (type !== expected && type !== `${targetVal.name}${expected}`) {
          results.push({
            message: `RPC "${rpc.name}" ${suffix.toLowerCase()} type must be named "${expected}".`,
            path: [...ctx.path, 'rpcs', i, property],
          });
        }
      }
    });

    return results;
  },
);

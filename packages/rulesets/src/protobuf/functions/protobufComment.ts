import { createRulesetFunction } from '@stoplight/spectral-core';

const KINDS: Record<string, string> = {
  services: 'Service',
  rpcs: 'RPC',
  messages: 'Message',
};

export default createRulesetFunction<{ name: string; comment?: string }, null>(
  {
    input: null,
    options: null,
  },
  function protobufComment(targetVal, _opts, ctx) {
    if (typeof targetVal.comment === 'string' && targetVal.comment.trim().length > 0) return;
    const kind = KINDS[String(ctx.path[ctx.path.length - 2])] ?? 'Declaration';

    return [
      {
        message: `${kind} "${targetVal.name}" must have a leading comment.`,
        path: [...ctx.path, 'name'],
      },
    ];
  },
);

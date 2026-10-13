import { createRulesetFunction } from '@stoplight/spectral-core';

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function mcpPackageFileSha256(pkg) {
    if (pkg.registryType !== 'mcpb') return;
    if (typeof pkg.fileSha256 === 'string' && pkg.fileSha256.length > 0) return;

    return [
      {
        message: 'MCPB package must specify "fileSha256" so clients can verify the downloaded file.',
      },
    ];
  },
);

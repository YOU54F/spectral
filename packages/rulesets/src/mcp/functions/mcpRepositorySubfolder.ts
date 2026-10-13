import { createRulesetFunction } from '@stoplight/spectral-core';

const VALID_CHARACTERS = /^[a-zA-Z0-9\-_./]+$/;

export default createRulesetFunction<string, null>(
  {
    input: {
      type: 'string',
    },
    options: null,
  },
  function mcpRepositorySubfolder(subfolder) {
    const segments = subfolder.split('/');

    if (
      subfolder.startsWith('/') ||
      subfolder.endsWith('/') ||
      !VALID_CHARACTERS.test(subfolder) ||
      segments.some(segment => segment === '' || segment === '.' || segment === '..')
    ) {
      return [
        {
          message: `Repository subfolder "${subfolder}" must be a relative path (e.g. "src/server") without leading or trailing slashes, "." or ".." segments.`,
        },
      ];
    }

    return;
  },
);

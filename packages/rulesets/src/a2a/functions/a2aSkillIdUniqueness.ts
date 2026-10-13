import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

export default createRulesetFunction<unknown[], null>(
  {
    input: {
      type: 'array',
    },
    options: null,
  },
  function a2aSkillIdUniqueness(skills, _opts, context) {
    const results: IFunctionResult[] = [];
    const seen = new Set<string>();

    skills.forEach((skill, index) => {
      if (!isPlainObject(skill) || typeof skill.id !== 'string') return;

      if (seen.has(skill.id)) {
        results.push({
          message: `"id" must be unique across all skills. "${skill.id}" is duplicated.`,
          path: [...context.path, index, 'id'],
        });
      } else {
        seen.add(skill.id);
      }
    });

    return results;
  },
);

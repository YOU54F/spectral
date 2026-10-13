import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

type Path = (string | number)[];

// 1.0: { "schemes": { "<scheme>": { "list": ["scope"] } } }
// 0.3: { "<scheme>": ["scope"] } (OpenAPI style)
function collectReferences(requirements: unknown, path: Path, references: [string, Path][]): void {
  if (!Array.isArray(requirements)) return;

  requirements.forEach((requirement, index) => {
    if (!isPlainObject(requirement)) return;

    if (isPlainObject(requirement.schemes)) {
      for (const name of Object.keys(requirement.schemes)) {
        references.push([name, [...path, index, 'schemes', name]]);
      }
    } else if (!('schemes' in requirement)) {
      for (const name of Object.keys(requirement)) {
        references.push([name, [...path, index, name]]);
      }
    }
  });
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function a2aSecurityRequirementsDefined(card) {
    const references: [string, Path][] = [];

    for (const field of ['securityRequirements', 'security']) {
      collectReferences(card[field], [field], references);
    }

    if (Array.isArray(card.skills)) {
      card.skills.forEach((skill, index) => {
        if (!isPlainObject(skill)) return;
        for (const field of ['securityRequirements', 'security']) {
          collectReferences(skill[field], ['skills', index, field], references);
        }
      });
    }

    const schemes = isPlainObject(card.securitySchemes) ? card.securitySchemes : {};
    const results: IFunctionResult[] = [];

    for (const [name, path] of references) {
      if (!Object.prototype.hasOwnProperty.call(schemes, name)) {
        results.push({
          message: `Security scheme "${name}" is not defined in "securitySchemes".`,
          path,
        });
      }
    }

    return results;
  },
);

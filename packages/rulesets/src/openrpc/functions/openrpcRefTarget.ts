import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { pointerToPath } from '@stoplight/json';
import type { JsonPath } from '@stoplight/types';

import { isObject } from './utils/guards';

type Section = 'contentDescriptors' | 'errors' | 'tags' | 'links' | 'examplePairings' | 'examples';

type RefSite = {
  path: JsonPath;
  ref: unknown;
  // components section the reference must point at, null when any (local) target is fine
  section: Section | null;
};

function getRef(value: unknown): unknown {
  return isObject(value) && '$ref' in value ? value.$ref : void 0;
}

function collectPairingRefs(pairing: Record<string, unknown>, path: JsonPath, sites: RefSite[]): void {
  if (Array.isArray(pairing.params)) {
    pairing.params.forEach((param, i) => {
      const ref = getRef(param);
      if (ref !== void 0) sites.push({ path: [...path, 'params', i, '$ref'], ref, section: 'examples' });
    });
  }

  const ref = getRef(pairing.result);
  if (ref !== void 0) sites.push({ path: [...path, 'result', '$ref'], ref, section: 'examples' });
}

const METHOD_ARRAYS: ReadonlyArray<[key: string, section: Section]> = [
  ['params', 'contentDescriptors'],
  ['errors', 'errors'],
  ['tags', 'tags'],
  ['links', 'links'],
  ['examples', 'examplePairings'],
];

function collectRefSites(document: Record<string, unknown>): RefSite[] {
  const sites: RefSite[] = [];

  if (Array.isArray(document.methods)) {
    document.methods.forEach((method, i) => {
      const methodPath = ['methods', i];
      const ref = getRef(method);
      if (ref !== void 0) {
        sites.push({ path: [...methodPath, '$ref'], ref, section: null });
        return;
      }

      if (!isObject(method)) return;

      for (const [key, section] of METHOD_ARRAYS) {
        const items = method[key];
        if (!Array.isArray(items)) continue;
        items.forEach((item, j) => {
          const ref = getRef(item);
          if (ref !== void 0) {
            sites.push({ path: [...methodPath, key, j, '$ref'], ref, section });
          } else if (key === 'examples' && isObject(item)) {
            collectPairingRefs(item, [...methodPath, key, j], sites);
          }
        });
      }

      const resultRef = getRef(method.result);
      if (resultRef !== void 0) {
        sites.push({ path: [...methodPath, 'result', '$ref'], ref: resultRef, section: 'contentDescriptors' });
      }
    });
  }

  const components = document.components;
  if (isObject(components) && isObject(components.examplePairings)) {
    for (const [name, pairing] of Object.entries(components.examplePairings)) {
      if (isObject(pairing)) {
        collectPairingRefs(pairing, ['components', 'examplePairings', name], sites);
      }
    }
  }

  return sites;
}

function resolveLocal(document: unknown, ref: string): boolean {
  let path: JsonPath;
  try {
    path = pointerToPath(ref);
  } catch {
    return false;
  }

  let value: unknown = document;
  for (const segment of path) {
    if (Array.isArray(value) && /^(?:0|[1-9][0-9]*)$/.test(String(segment))) {
      value = value[Number(segment)];
    } else if (isObject(value) && Object.prototype.hasOwnProperty.call(value, segment)) {
      value = value[segment];
    } else {
      return false;
    }
  }

  return true;
}

export default createRulesetFunction<Record<string, unknown>, null>(
  {
    input: {
      type: 'object',
    },
    options: null,
  },
  function openrpcRefTarget(targetVal) {
    const results: IFunctionResult[] = [];

    for (const { path, ref, section } of collectRefSites(targetVal)) {
      // external references are resolved (and reported, if broken) by the ref resolver
      if (typeof ref !== 'string' || !ref.startsWith('#')) continue;

      if (section !== null) {
        const prefix = `#/components/${section}/`;
        if (!ref.startsWith(prefix) || ref.length === prefix.length || ref.indexOf('/', prefix.length) !== -1) {
          results.push({
            message: `"$ref" must point to an entry of "#/components/${section}", got "${ref}".`,
            path,
          });
          continue;
        }
      }

      if (!resolveLocal(targetVal, ref)) {
        results.push({
          message: `"$ref" target "${ref}" does not exist in the document.`,
          path,
        });
      }
    }

    return results;
  },
);

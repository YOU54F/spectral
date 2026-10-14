import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { attr, attrPath, children, definitions, reference, WSDL, WsdlDocument } from './utils';

// Every operation of a port type must be bound by each binding of that port type (WS-I BP R2718).
export default createRulesetFunction<WsdlDocument, null>(
  {
    input: null,
    options: null,
  },
  function wsdlBindingComplete(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const binding of children(defs.root, WSDL, 'binding')) {
      const portType = reference(defs, binding, 'type', 'portTypes', []);
      if (portType === null) continue;

      const bound = new Set(children(binding, WSDL, 'operation').map(({ element }) => attr(element, 'name')));
      for (const operation of children(portType, WSDL, 'operation')) {
        const name = attr(operation.element, 'name');
        if (name !== void 0 && !bound.has(name)) {
          results.push({
            message: `Binding "${attr(binding.element, 'name') ?? ''}" does not bind operation "${name}" of port type "${
              attr(portType.element, 'name') ?? ''
            }".`,
            path: binding.element.attributes.name !== void 0 ? attrPath(binding, 'name') : binding.path,
          });
        }
      }
    }

    return results;
  },
);

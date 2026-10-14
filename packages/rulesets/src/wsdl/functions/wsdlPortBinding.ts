import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { children, definitions, reference, WSDL, WsdlDocument } from './utils';

// Service ports must refer to a defined binding.
export default createRulesetFunction<WsdlDocument, null>(
  {
    input: null,
    options: null,
  },
  function wsdlPortBinding(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const service of children(defs.root, WSDL, 'service')) {
      for (const port of children(service, WSDL, 'port')) {
        reference(defs, port, 'binding', 'bindings', results);
      }
    }

    return results;
  },
);

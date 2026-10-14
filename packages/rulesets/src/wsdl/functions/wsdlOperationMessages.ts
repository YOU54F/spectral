import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { children, definitions, reference, WSDL } from './utils';

// The input, output and fault messages of port type operations must be defined.
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlOperationMessages(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const portType of children(defs.root, WSDL, 'portType')) {
      for (const operation of children(portType, WSDL, 'operation')) {
        for (const io of children(operation, WSDL)) {
          if (['input', 'output', 'fault'].includes(io.element.localName)) {
            reference(defs, io, 'message', 'messages', results);
          }
        }
      }
    }

    return results;
  },
);

import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { attr, attrPath, children, definitions, isHttpBinding, soapBinding, WSDL } from './utils';

// Every binding must have a soap:binding or soap12:binding with a transport. HTTP bindings (http:binding) are skipped.
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlSoapBinding(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const binding of children(defs.root, WSDL, 'binding')) {
      const soap = soapBinding(binding);
      const name = attr(binding.element, 'name') ?? '';
      if (soap === void 0) {
        if (!isHttpBinding(binding)) {
          results.push({
            message: `Binding "${name}" must have a soap:binding or soap12:binding.`,
            path: binding.element.attributes.name !== void 0 ? attrPath(binding, 'name') : binding.path,
          });
        }
      } else if ((attr(soap.element, 'transport') ?? '').trim().length === 0) {
        results.push({
          message: `The ${soap.element.name} of binding "${name}" must have a "transport".`,
          path: soap.element.attributes.transport !== void 0 ? attrPath(soap, 'transport') : soap.path,
        });
      }
    }

    return results;
  },
);

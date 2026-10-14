import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import { attr, attrPath, children, definitions, soapBinding, SOAP_NAMESPACES, WSDL, WsdlDocument } from './utils';
import type { Located } from './utils';

// With `check: rpc`, flags rpc style on soap:binding and soap:operation.
// With `check: consistent`, flags operations whose style differs from the first operation of the binding (WS-I BP R2705).
export default createRulesetFunction<WsdlDocument, { check: 'rpc' | 'consistent' }>(
  {
    input: null,
    options: {
      type: 'object',
      properties: {
        check: { enum: ['rpc', 'consistent'] },
      },
      required: ['check'],
      additionalProperties: false,
    },
  },
  function wsdlBindingStyle(targetVal, { check }, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const binding of children(defs.root, WSDL, 'binding')) {
      const soap = soapBinding(binding);
      if (soap === void 0) continue;
      const bindingName = attr(binding.element, 'name') ?? '';
      const defaultStyle = attr(soap.element, 'style') ?? 'document';

      if (check === 'rpc' && attr(soap.element, 'style') === 'rpc') {
        results.push({
          message: `Binding "${bindingName}" uses rpc style, prefer document/literal.`,
          path: attrPath(soap, 'style'),
        });
      }

      let first: string | undefined;
      for (const operation of children(binding, WSDL, 'operation')) {
        const soapOperation: Located | undefined = children(operation, SOAP_NAMESPACES, 'operation')[0];
        const explicit = soapOperation !== void 0 ? attr(soapOperation.element, 'style') : void 0;
        const style = explicit ?? defaultStyle;
        const name = attr(operation.element, 'name') ?? '';

        if (check === 'rpc') {
          if (explicit === 'rpc' && soapOperation !== void 0) {
            results.push({
              message: `Operation "${name}" uses rpc style, prefer document/literal.`,
              path: attrPath(soapOperation, 'style'),
            });
          }
        } else if (first === void 0) {
          first = style;
        } else if (style !== first) {
          results.push({
            message: `Operation "${name}" uses ${style} style, but binding "${bindingName}" also has ${first} style operations.`,
            path:
              soapOperation !== void 0 && explicit !== void 0
                ? attrPath(soapOperation, 'style')
                : attrPath(operation, 'name'),
          });
        }
      }
    }

    return results;
  },
);

import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { attr, attrPath, children, definitions, reference, WSDL } from './utils';

// Bindings must refer to a defined port type, and with `operations`, bind only operations of that port type.
export default createRulesetFunction<XmlElement, { check: 'type' | 'operations' }>(
  {
    input: null,
    options: {
      type: 'object',
      properties: {
        check: { enum: ['type', 'operations'] },
      },
      required: ['check'],
      additionalProperties: false,
    },
  },
  function wsdlBindingPortType(targetVal, { check }, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const binding of children(defs.root, WSDL, 'binding')) {
      const portType = reference(defs, binding, 'type', 'portTypes', check === 'type' ? results : []);
      if (check !== 'operations' || portType === null) continue;

      const names = new Set(children(portType, WSDL, 'operation').map(({ element }) => attr(element, 'name')));
      for (const operation of children(binding, WSDL, 'operation')) {
        const name = attr(operation.element, 'name');
        if (name === void 0) {
          results.push({ message: 'Binding operations must have a "name" attribute.', path: operation.path });
        } else if (!names.has(name)) {
          results.push({
            message: `Operation "${name}" is not defined in port type "${attr(portType.element, 'name') ?? ''}".`,
            path: attrPath(operation, 'name'),
          });
        }
      }
    }

    return results;
  },
);

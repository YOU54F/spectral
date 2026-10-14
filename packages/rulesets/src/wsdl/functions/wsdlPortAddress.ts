import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { attr, attrPath, children, definitions, HTTP, isHttpBinding, reference, SOAP_NAMESPACES, WSDL } from './utils';

// Every port must have a soap:address or soap12:address with a location.
// Ports of an HTTP binding (http:binding) may use http:address instead.
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlPortAddress(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const service of children(defs.root, WSDL, 'service')) {
      for (const port of children(service, WSDL, 'port')) {
        const binding = reference(defs, port, 'binding', 'bindings', []);
        const namespaces = binding !== null && isHttpBinding(binding) ? [...SOAP_NAMESPACES, HTTP] : SOAP_NAMESPACES;
        const name = attr(port.element, 'name') ?? '';
        const address = children(port, namespaces, 'address')[0];
        if (address === void 0) {
          results.push({
            message: `Port "${name}" must have a soap:address or soap12:address.`,
            path: port.element.attributes.name !== void 0 ? attrPath(port, 'name') : port.path,
          });
        } else if ((attr(address.element, 'location') ?? '').trim().length === 0) {
          results.push({
            message: `The address of port "${name}" must have a "location".`,
            path: address.element.attributes.location !== void 0 ? attrPath(address, 'location') : address.path,
          });
        }
      }
    }

    return results;
  },
);

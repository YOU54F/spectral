import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { attrPath, children, definitions, Located, SOAP_NAMESPACES, WSDL } from './utils';

// soap:body, soap:header, soap:headerfault and soap:fault must not use the SOAP encoding (WS-I BP R2706).
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlSoapUse(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    const visit = (located: Located): void => {
      located.element.children.forEach((element, i) => {
        const child = { element, path: [...located.path, 'children', i] };
        if (
          element.namespace !== null &&
          SOAP_NAMESPACES.includes(element.namespace) &&
          element.attributes.use?.value === 'encoded'
        ) {
          results.push({
            message: `${element.name} must use "literal", not "encoded".`,
            path: attrPath(child, 'use'),
          });
        }

        visit(child);
      });
    };

    children(defs.root, WSDL, 'binding').forEach(visit);
    return results;
  },
);

import { createRulesetFunction } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { hasDocumentation } from './utils';

const KINDS: Record<string, string> = {
  service: 'Service',
  portType: 'Port type',
  operation: 'Operation',
};

// The element must have a non-empty wsdl:documentation child.
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlDocumentation(targetVal, _opts, ctx) {
    if (hasDocumentation({ element: targetVal, path: ctx.path })) return;
    const name = targetVal.attributes.name?.value ?? '';

    return [
      {
        message: `${KINDS[targetVal.localName] ?? 'Element'} "${name}" must have a wsdl:documentation element.`,
        path: targetVal.attributes.name !== void 0 ? [...ctx.path, 'attributes', 'name', 'value'] : ctx.path,
      },
    ];
  },
);

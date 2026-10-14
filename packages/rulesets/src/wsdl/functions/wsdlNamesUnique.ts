import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { attr, attrPath, children, definitions, Located, WSDL } from './utils';

const KINDS: Record<string, string> = {
  message: 'Message',
  portType: 'Port type',
  binding: 'Binding',
  service: 'Service',
};

function unique(items: Located[], describe: (name: string) => string, results: IFunctionResult[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    const name = attr(item.element, 'name');
    if (name === void 0) continue;
    if (seen.has(name)) {
      results.push({ message: describe(name), path: attrPath(item, 'name') });
    } else {
      seen.add(name);
    }
  }
}

// Messages, port types, bindings, services and ports must have unique names in the document,
// operations within a port type (no overloading, WS-I BP R2304) and parts within a message.
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlNamesUnique(targetVal, _opts, ctx) {
    const { root } = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const [localName, kind] of Object.entries(KINDS)) {
      unique(children(root, WSDL, localName), name => `${kind} "${name}" is already defined.`, results);
    }

    for (const message of children(root, WSDL, 'message')) {
      const owner = attr(message.element, 'name') ?? '';
      unique(
        children(message, WSDL, 'part'),
        name => `Part "${name}" is already defined in message "${owner}".`,
        results,
      );
    }

    for (const portType of children(root, WSDL, 'portType')) {
      const owner = attr(portType.element, 'name') ?? '';
      unique(
        children(portType, WSDL, 'operation'),
        name => `Operation "${name}" is already defined in port type "${owner}".`,
        results,
      );
    }

    unique(
      children(root, WSDL, 'service').flatMap(service => children(service, WSDL, 'port')),
      name => `Port "${name}" is already defined.`,
      results,
    );

    return results;
  },
);

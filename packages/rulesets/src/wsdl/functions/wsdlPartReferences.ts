import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { XmlElement } from '@stoplight/spectral-parsers';
import { attr, attrPath, children, definitions, resolveQName, WSDL, XSD } from './utils';

// Message parts refer to an XSD element or type. The QName prefix must be bound, and when the namespace
// is the target namespace or the target namespace of an inline schema, the element or type must be defined there.
export default createRulesetFunction<XmlElement, null>(
  {
    input: null,
    options: null,
  },
  function wsdlPartReferences(targetVal, _opts, ctx) {
    const defs = definitions(targetVal, ctx.path);
    const results: IFunctionResult[] = [];

    for (const message of children(defs.root, WSDL, 'message')) {
      for (const part of children(message, WSDL, 'part')) {
        const name = attr(part.element, 'name') ?? '';
        const element = attr(part.element, 'element');
        const type = attr(part.element, 'type');
        if (element === void 0 && type === void 0) {
          results.push({ message: `Part "${name}" must have an "element" or a "type" attribute.`, path: part.path });
          continue;
        }

        if (element !== void 0 && type !== void 0) {
          results.push({
            message: `Part "${name}" must not have both an "element" and a "type" attribute.`,
            path: attrPath(part, 'type'),
          });
        }

        for (const [attribute, value] of [
          ['element', element],
          ['type', type],
        ] as const) {
          if (value === void 0) continue;
          const qname = resolveQName(part.element, value);
          if ('unbound' in qname) {
            results.push({
              message: `Namespace prefix "${qname.unbound}" of "${value}" is not bound.`,
              path: attrPath(part, attribute),
            });
            continue;
          }

          const { namespace, localName } = qname;
          if (namespace === XSD || (namespace !== null && defs.imported.has(namespace))) continue;
          const schema = defs.schemas.get(namespace);
          const kind = attribute === 'element' ? 'Element' : 'Type';
          if (schema === void 0) {
            if (namespace === defs.targetNamespace) {
              results.push({
                message: `${kind} "${value}" is not defined: no inline schema has the namespace "${namespace ?? ''}".`,
                path: attrPath(part, attribute),
              });
            }

            continue;
          }

          if (!schema.open && !(attribute === 'element' ? schema.elements : schema.types).has(localName)) {
            results.push({
              message: `${kind} "${value}" is not defined in the inline schema for "${namespace ?? ''}".`,
              path: attrPath(part, attribute),
            });
          }
        }
      }
    }

    return results;
  },
);

import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufDocument } from '@stoplight/spectral-parsers';
import { forEachField } from './utils';

// proto2 syntax that protoc rejects in editions files, where features replace it.
export default createRulesetFunction<ProtobufDocument, null>(
  {
    input: null,
    options: null,
  },
  function protobufEditionsLegacySyntax(targetVal, _opts, ctx) {
    if (targetVal.syntax !== 'editions') return;
    const results: IFunctionResult[] = [];

    forEachField(targetVal, ctx.path, ({ field, path }) => {
      if (field.label === 'required') {
        results.push({
          message: 'Label "required" is not allowed in editions; use "features.field_presence = LEGACY_REQUIRED".',
          path: [...path, 'label'],
        });
      } else if (field.label === 'optional') {
        results.push({
          message:
            'Label "optional" is not allowed in editions; fields have explicit presence by default (see "features.field_presence").',
          path: [...path, 'label'],
        });
      }

      if (field.group === true) {
        results.push({
          message:
            'Group syntax is not allowed in editions; use a message field with "features.message_encoding = DELIMITED".',
          path: [...path, 'group'],
        });
      }

      if (field.options !== void 0 && 'packed' in field.options) {
        results.push({
          message: 'Field option "packed" is not allowed in editions; use "features.repeated_field_encoding".',
          path: [...path, 'options', 'packed'],
        });
      }
    });

    return results;
  },
);

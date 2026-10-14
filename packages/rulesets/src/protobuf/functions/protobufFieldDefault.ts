import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufDocument } from '@stoplight/spectral-parsers';
import { forEachField, resolveFeature } from './utils';

// `[default = ...]` where protoc rejects it: in proto3 files, on repeated fields, and in editions files on fields
// with implicit presence (`features.field_presence = IMPLICIT`, set on the field or inherited from a message or the file).
export default createRulesetFunction<ProtobufDocument, null>(
  {
    input: null,
    options: null,
  },
  function protobufFieldDefault(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];

    forEachField(targetVal, ctx.path, ({ field, path, scopes, oneof, extension }) => {
      if (field.options === void 0 || !('default' in field.options)) return;
      let message: string | undefined;

      if (targetVal.syntax === 'proto3') {
        message = 'Default values are not allowed in proto3.';
      } else if (field.label === 'repeated' || field.keyType !== void 0) {
        message = 'Repeated fields cannot have a default value.';
      } else if (
        targetVal.syntax === 'editions' &&
        // oneof fields and extensions always have explicit presence
        !oneof &&
        !extension &&
        resolveFeature('field_presence', [...scopes, field.options]) === 'IMPLICIT'
      ) {
        message = 'Fields with implicit presence ("features.field_presence = IMPLICIT") cannot have a default value.';
      }

      if (message !== void 0) results.push({ message, path: [...path, 'options', 'default'] });
    });

    return results;
  },
);

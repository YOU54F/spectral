import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufField, ProtobufMessage } from '@stoplight/spectral-parsers';
import { inReservedRange } from './utils';

export type Options = {
  // "number": field numbers must be unique and not reserved; "name": field names must be unique and not reserved
  property: 'number' | 'name';
};

// All fields of a message, including the fields of its oneofs, with their path relative to the message.
function allFields(message: ProtobufMessage): { field: ProtobufField; path: (string | number)[] }[] {
  const fields = (Array.isArray(message.fields) ? message.fields : []).map((field, i) => ({
    field,
    path: ['fields', i],
  }));
  (Array.isArray(message.oneofs) ? message.oneofs : []).forEach((oneof, i) => {
    (Array.isArray(oneof.fields) ? oneof.fields : []).forEach((field, j) => {
      fields.push({ field, path: ['oneofs', i, 'fields', j] });
    });
  });

  return fields;
}

export default createRulesetFunction<ProtobufMessage, Options>(
  {
    input: null,
    options: {
      type: 'object',
      additionalProperties: false,
      properties: {
        property: { enum: ['number', 'name'] },
      },
      required: ['property'],
    },
  },
  function protobufFieldsUnique(targetVal, { property }, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Map<string | number, string>();
    const reserved = targetVal.reserved ?? { ranges: [], names: [] };

    for (const { field, path } of allFields(targetVal)) {
      const value = field[property];
      const at = [...ctx.path, ...path, property];

      const isReserved =
        property === 'number' ? inReservedRange(field.number, reserved.ranges) : reserved.names.includes(field.name);
      if (isReserved) {
        results.push({
          message:
            property === 'number'
              ? `Field number ${value} of field "${field.name}" is reserved.`
              : `Field name "${field.name}" is reserved.`,
          path: at,
        });
      }

      const other = seen.get(value);
      if (other !== void 0) {
        results.push({
          message:
            property === 'number'
              ? `Field number ${value} of field "${field.name}" is already used by field "${other}".`
              : `Field name "${field.name}" is already used in message "${targetVal.name}".`,
          path: at,
        });
      } else {
        seen.set(value, field.name);
      }
    }

    return results;
  },
);

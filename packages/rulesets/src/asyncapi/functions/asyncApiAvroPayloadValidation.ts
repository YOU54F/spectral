import { createRulesetFunction } from '@stoplight/spectral-core';
import { isPlainObject } from '@stoplight/json';

import { lintAvroSchema } from '../../avro/functions/utils/lintAvroSchema';

/**
 * Matches Avro schema formats, e.g. `application/vnd.apache.avro;version=1.9.0` or `application/vnd.apache.avro+yaml;version=1.8.2`.
 */
export const AVRO_SCHEMA_FORMAT = /^application\/vnd\.apache\.avro(\+(json|yaml))?(;\s*version=1(\.\d+){0,2})?$/;

export type Options = {
  /** Property holding the schema next to `schemaFormat`: `payload` for AsyncAPI 2.x messages, `schema` for AsyncAPI 3.x Multi Format Schema Objects. */
  schemaField: 'payload' | 'schema';
  /** Which checks to run. Logical-type problems are reported by a separate warning rule. Defaults to `structure`. */
  checks?: 'structure' | 'logicalTypes';
};

export default createRulesetFunction<unknown, Options>(
  {
    input: null,
    options: {
      type: 'object',
      properties: {
        schemaField: {
          enum: ['payload', 'schema'],
        },
        checks: {
          enum: ['structure', 'logicalTypes'],
        },
      },
      required: ['schemaField'],
      additionalProperties: false,
    },
  },
  function asyncApiAvroPayloadValidation(targetVal, { schemaField, checks = 'structure' }, context) {
    if (!isPlainObject(targetVal)) return;

    const { schemaFormat } = targetVal;
    if (typeof schemaFormat !== 'string' || !AVRO_SCHEMA_FORMAT.test(schemaFormat)) return;
    if (!(schemaField in targetVal)) return;

    return lintAvroSchema(targetVal[schemaField], [...context.path, schemaField], context, checks);
  },
);

import { avro1 } from '@stoplight/spectral-formats';

import {
  avroSchema,
  avroNames,
  avroNameUniqueness,
  avroTypeReferences,
  avroFieldNameUniqueness,
  avroFieldDefaults,
  avroUnionDefaults,
  avroEnumSymbols,
  avroUnions,
  avroLogicalTypes,
  avroOptionalFields,
  avroRecordDoc,
  avroFieldDoc,
} from './functions';

export default {
  documentationUrl: 'https://meta.stoplight.io/docs/spectral/docs/reference/avro-rules.md',
  formats: [avro1],
  rules: {
    'avro-schema': {
      description: 'Avro schema must have a valid structure.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroSchema,
      },
    },
    'avro-name-valid': {
      description: 'Names, namespaces, field names and aliases must follow the Avro name grammar.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroNames,
      },
    },
    'avro-name-unique': {
      description: 'Full names of named types must be unique within the schema.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroNameUniqueness,
      },
    },
    'avro-type-reference-resolved': {
      description: 'References to named types must resolve to a type defined earlier in the schema.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroTypeReferences,
      },
    },
    'avro-field-name-unique': {
      description: 'Field names must be unique within a record.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroFieldNameUniqueness,
      },
    },
    'avro-field-default-valid': {
      description: 'Field default values must match the field type.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroFieldDefaults,
      },
    },
    'avro-union-default-first-member': {
      description: 'Default values of union fields should match the first member of the union.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: avroUnionDefaults,
      },
    },
    'avro-enum-symbols-valid': {
      description: 'Enum symbols must be valid, unique names and the enum default must be one of them.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroEnumSymbols,
      },
    },
    'avro-union-valid': {
      description: 'Unions must not contain duplicate types or directly nested unions.',
      message: '{{error}}',
      severity: 0,
      recommended: true,
      given: '$',
      then: {
        function: avroUnions,
      },
    },
    'avro-logical-type-valid': {
      description: 'Logical types must annotate the correct underlying type with valid attributes.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: avroLogicalTypes,
      },
    },
    'avro-optional-field-null-default': {
      description: 'Optional fields should be a union with "null" first and declare "default": null.',
      message: '{{error}}',
      severity: 1,
      recommended: true,
      given: '$',
      then: {
        function: avroOptionalFields,
      },
    },
    'avro-record-doc': {
      description: 'Records should have a "doc".',
      message: '{{error}}',
      severity: 2,
      recommended: false,
      given: '$',
      then: {
        function: avroRecordDoc,
      },
    },
    'avro-field-doc': {
      description: 'Record fields should have a "doc".',
      message: '{{error}}',
      severity: 2,
      recommended: false,
      given: '$',
      then: {
        function: avroFieldDoc,
      },
    },
  },
};

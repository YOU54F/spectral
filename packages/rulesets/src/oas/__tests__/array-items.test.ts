import { DiagnosticSeverity } from '@stoplight/types';

import testRule from '../../__tests__/__helpers__/tester';

testRule('array-items', [
  {
    name: 'valid case',
    document: {
      swagger: '2.0',
      securityDefinitions: {
        apikey: {},
      },
      paths: {
        '/path': {
          get: {
            security: [
              {
                apikey: [],
              },
            ],
          },
        },
      },
    },
    errors: [],
  },

  {
    name: 'array items sibling is present in a oas2 document',
    document: {
      swagger: '2.0',
      securityDefinitions: {
        apikey: {},
        $ref: '#/securityDefinitions/apikey',
      },
      paths: {
        $ref: '#/securityDefinitions/apikey',
        '/path': {
          get: {
            '200': {
              schema: {
                type: 'array',
                items: {},
              },
            },
          },
          post: {
            '201': {
              type: 'array',
              items: {
                type: 'array',
                items: {},
              },
            },
          },
        },
      },
    },
    errors: [],
  },

  {
    name: 'array items sibling is present in oas3 document',
    document: {
      $ref: '#/',
      responses: {
        200: {
          type: 'array',
          items: {},
        },
        201: {
          type: 'array',
          items: {
            type: 'array',
            items: {},
          },
        },
      },
      openapi: '3.0.0',
    },
    errors: [],
  },

  {
    name: 'array items sibling is present in oas3.1 document',
    document: {
      openapi: '3.1.0',
      paths: {
        '/path': {
          get: {
            responses: {
              '200': {
                type: 'array',
                items: {},
              },
            },
          },
          post: {
            responses: {
              '201': {
                type: 'array',
                items: {
                  type: 'array',
                  items: {},
                },
              },
            },
          },
        },
      },
    },
    errors: [],
  },

  {
    name: 'array items sibling is missing in a oas2 document',
    document: {
      swagger: '2.0',
      securityDefinitions: {
        apikey: {},
        $ref: '#/securityDefinitions/apikey',
      },
      paths: {
        $ref: '#/securityDefinitions/apikey',
        '/path': {
          get: {
            '200': {
              schema: {
                type: 'array',
              },
            },
          },
          post: {
            '201': {
              type: 'array',
              items: {
                type: 'array',
              },
            },
          },
        },
      },
    },
    errors: [
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['paths', '/path', 'get', '200', 'schema'],
        severity: DiagnosticSeverity.Error,
      },
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['paths', '/path', 'post', '201', 'items'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },

  {
    name: 'array items sibling is missing in oas3 document',
    document: {
      $ref: '#/',
      responses: {
        200: {
          type: 'array',
        },
        201: {
          type: 'array',
          items: {
            type: 'array',
          },
        },
      },
      openapi: '3.0.0',
    },
    errors: [
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['responses', '200'],
        severity: DiagnosticSeverity.Error,
      },
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['responses', '201', 'items'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },

  {
    name: 'array items sibling is missing in oas3.1 document',
    document: {
      openapi: '3.1.0',
      paths: {
        '/path': {
          get: {
            responses: {
              '200': {
                type: 'array',
              },
            },
          },
          post: {
            responses: {
              '201': {
                type: 'array',
                items: {
                  type: 'array',
                },
              },
            },
          },
        },
      },
    },
    errors: [
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['paths', '/path', 'get', 'responses', '200'],
        severity: DiagnosticSeverity.Error,
      },
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['paths', '/path', 'post', 'responses', '201', 'items'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },

  {
    name: 'array with prefixItems and no items is valid in oas3.1 document',
    document: {
      openapi: '3.1.0',
      components: {
        schemas: {
          Tuple: {
            type: 'array',
            prefixItems: [{ type: 'string' }, { type: 'number' }],
          },
          NullableTuple: {
            type: ['array', 'null'],
            prefixItems: [{ type: 'string' }],
          },
          Nested: {
            type: 'array',
            items: {
              type: 'array',
              prefixItems: [{ type: 'string' }],
              minItems: 1,
              maxItems: 1,
            },
          },
        },
      },
    },
    errors: [],
  },

  {
    name: 'array with prefixItems and no items is invalid in oas3.0 document',
    document: {
      openapi: '3.0.3',
      components: {
        schemas: {
          Tuple: {
            type: 'array',
            prefixItems: [{ type: 'string' }],
          },
        },
      },
    },
    errors: [
      {
        code: 'array-items',
        message: 'Schemas with "type: array", require a sibling "items" field',
        path: ['components', 'schemas', 'Tuple'],
        severity: DiagnosticSeverity.Error,
      },
    ],
  },
]);

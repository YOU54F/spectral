// A complete OpenRPC 1.3 document that passes every rule of the spectral:openrpc ruleset.
// Every call returns a fresh copy, so tests can mutate it freely.
export function createDocument(openrpc = '1.3.2'): Record<string, any> {
  return {
    openrpc,
    info: {
      title: 'Petstore',
      version: '1.0.0',
      description: 'A sample pet store service.',
    },
    servers: [
      {
        name: 'production',
        url: 'https://{region}.petstore.example/rpc',
        variables: {
          region: {
            default: 'eu',
            enum: ['eu', 'us'],
          },
        },
      },
    ],
    methods: [
      {
        name: 'list_pets',
        summary: 'List pets',
        tags: [{ $ref: '#/components/tags/pets' }],
        paramStructure: 'by-name',
        params: [
          { $ref: '#/components/contentDescriptors/limit' },
          {
            name: 'offset',
            schema: { type: 'integer', minimum: 0 },
          },
        ],
        result: {
          name: 'pets',
          schema: {
            type: 'array',
            items: { $ref: '#/components/schemas/Pet' },
          },
        },
        errors: [{ $ref: '#/components/errors/NotFound' }, { code: -32602, message: 'Invalid params' }],
        examples: [
          {
            name: 'firstPage',
            params: [
              { name: 'limit', value: 1 },
              { name: 'offset', value: 0 },
            ],
            result: {
              name: 'pets',
              value: [{ id: 1, name: 'Rex' }],
            },
          },
          { $ref: '#/components/examplePairings/secondPage' },
        ],
      },
      {
        name: 'pet_created',
        description: 'Notification sent when a pet is created.',
        tags: [{ name: 'events' }],
        params: [{ name: 'pet', required: true, schema: { $ref: '#/components/schemas/Pet' } }],
        result: { name: 'ack', schema: { type: 'null' } },
      },
    ],
    components: {
      schemas: {
        Pet: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
          },
        },
      },
      contentDescriptors: {
        limit: {
          name: 'limit',
          required: true,
          schema: { type: 'integer', minimum: 1 },
        },
      },
      examples: {
        limitTen: { name: 'limit', value: 10 },
      },
      examplePairings: {
        secondPage: {
          name: 'secondPage',
          params: [{ $ref: '#/components/examples/limitTen' }],
          result: { name: 'pets', value: [] },
        },
      },
      errors: {
        NotFound: { code: 404, message: 'Not found' },
      },
      tags: {
        pets: { name: 'pets' },
      },
    },
  };
}

export function modifyDocument(
  modify: (document: Record<string, any>) => void,
  openrpc?: string,
): Record<string, unknown> {
  const document = createDocument(openrpc);
  modify(document);
  return document;
}

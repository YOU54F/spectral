import { createWithRules } from './__helpers__/tester';

const overlay1_1 = {
  overlay: '1.1.0',
  info: { title: 'Pets', version: '1.0.0' },
  actions: [
    {
      target: '$.paths./pets.get.responses.200.content.application/json',
      update: {
        schema: { $ref: '#/components/schemas/Pet' },
        examples: { remote: { $ref: './examples/pet.json' } },
      },
    },
    {
      target: '$.info',
      update: { $ref: '#/components/schemas/Info' },
    },
  ],
  'x-broken': { $ref: '#/definitions/Missing' },
};

const overlay1_2 = {
  overlay: '1.2.0',
  info: { title: 'Pets', version: '1.0.0' },
  components: {
    actions: {
      addPet: {
        fields: { update: { schema: { $ref: '#/components/schemas/Pet' } } },
      },
    },
  },
  actions: [
    { $ref: '#/components/actions/addPet', target: '$.paths./pets.post.requestBody.content.application/json' },
    { target: '$.info', update: { 'x-pet': { $ref: '#/components/schemas/Pet' } } },
    { $ref: '#/components/actions/missing', target: '$.info' },
  ],
};

describe('Overlay $refs', () => {
  it('does not resolve or report $refs within update values, but still reports other broken $refs', async () => {
    const results = await createWithRules(['overlay-document-schema']).run(JSON.stringify(overlay1_1));

    expect(results.filter(({ code }) => code === 'invalid-ref')).toEqual([
      expect.objectContaining({ path: ['x-broken', '$ref'] }),
    ]);
  });

  it('does not resolve or report $refs within 1.2 reusable action updates, but resolves action references', async () => {
    const results = await createWithRules(['overlay-document-schema']).run(JSON.stringify(overlay1_2));

    expect(results.filter(({ code }) => code === 'invalid-ref')).toEqual([
      expect.objectContaining({ path: ['actions', '2', '$ref'] }),
    ]);
  });
});

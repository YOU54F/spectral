import { avro1 } from '../avro';

describe('Avro format', () => {
  describe('Avro 1.x', () => {
    it.each([
      { type: 'record', name: 'User', fields: [] },
      { type: 'record', name: 'com.example.User', namespace: 'ignored', fields: [{ name: 'id', type: 'long' }] },
      { type: 'enum', name: 'Suit', symbols: ['SPADES', 'HEARTS'] },
      { type: 'fixed', name: 'md5', size: 16 },
      [{ type: 'record', name: 'A', fields: [] }, 'null', { type: 'array', items: 'A' }, { type: 'string' }],
      ['null', { type: 'enum', name: 'E', symbols: ['X'] }, 'com.example.Other'],
    ])('recognizes %o', document => {
      expect(avro1(document, null)).toBe(true);
    });

    it.each([
      null,
      {},
      'string',
      ['null', 'string'],
      [],
      { type: 'object', properties: {} },
      { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' },
      { type: 'record', fields: [] },
      { type: 'record', name: 'User' },
      { type: 'enum', name: 'Suit' },
      { type: 'enum', name: 'Suit', enum: ['A'] },
      { type: 'fixed', name: 'md5' },
      { type: 'string', name: 'foo' },
      { type: 'record', name: 'User', fields: [], properties: {} },
      { openapi: '3.1.0', info: {}, type: 'record', name: 'x', fields: [] },
      [{ type: 'record', name: 'A', fields: [] }, 1],
      [{ type: 'record', name: 'A', fields: [] }, { type: 'object' }],
      [{ type: 'record', name: 'A', fields: [] }, 'not a name'],
    ])('does not recognize %o', document => {
      expect(avro1(document, null)).toBe(false);
    });

    it.each(['/schemas/user.avsc', 'user.AVSC', 'https://example.com/user.avsc?version=1', 'file:///a/b.avsc#frag'])(
      'recognizes any schema-like document with %s source',
      source => {
        expect(avro1('string', source)).toBe(true);
        expect(avro1(['null', 'string'], source)).toBe(true);
        expect(avro1({ type: 'record' }, source)).toBe(true);
      },
    );

    it.each(['/schemas/user.json', '/schemas/user.avsc.json', 'user.avro', null])(
      'does not rely on the %s source',
      source => {
        expect(avro1(['null', 'string'], source)).toBe(false);
        expect(avro1({ type: 'object' }, source)).toBe(false);
      },
    );

    it('does not recognize scalar documents even with .avsc extension', () => {
      expect(avro1(1, 'a.avsc')).toBe(false);
      expect(avro1(null, 'a.avsc')).toBe(false);
    });
  });
});

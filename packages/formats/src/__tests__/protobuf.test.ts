import { protobuf } from '../protobuf';

describe('Protobuf format', () => {
  // the shape produced by the Protobuf parser of @stoplight/spectral-parsers
  const tree = { package: null, imports: [], options: {}, messages: [], enums: [], services: [], extends: [] };

  it.each(['proto2', 'proto3', 'editions'])('recognizes %s files', syntax => {
    expect(protobuf({ syntax, ...tree }, null)).toBe(true);
  });

  it.each([
    { openapi: '3.1.0', info: {}, paths: {} },
    { $schema: 'https://json-schema.org/draft/2020-12/schema', type: 'object' },
    { syntax: 'proto3' },
    { syntax: 'proto3', imports: {}, messages: [], enums: [], services: [] },
    { syntax: 'proto4', imports: [], messages: [], enums: [], services: [] },
    'syntax = "proto3";',
    null,
  ])('does not recognize %p', document => {
    expect(protobuf(document, null)).toBe(false);
  });
});

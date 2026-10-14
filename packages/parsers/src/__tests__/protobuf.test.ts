import { DiagnosticSeverity } from '@stoplight/types';
import { Protobuf, parseProtobuf } from '../protobuf';

const source = `// File comment, detached.

syntax = "proto3";

package acme.pets.v1;

import "google/protobuf/timestamp.proto";
import public "other.proto";

option java_package = "com.acme.pets";
option (custom.opt).enabled = true;

// A pet.
message Pet {
  /* The id. */
  string id = 1;
  repeated string tags = 2 [deprecated = true, json_name = "labels"];
  map<string, int32> counts = 3;
  optional google.protobuf.Timestamp born_at = 4;
  oneof owner {
    string person = 5;
    int64 org_id = 6;
  }
  reserved 8, 10 to 12, 100 to max;
  reserved "old", "older";

  message Nested {
    int32 x = 1; // trailing
  }

  enum Kind {
    option allow_alias = true;
    KIND_UNSPECIFIED = 0;
    // Dogs.
    KIND_DOG = 1 [deprecated = true];
    reserved 5;
  }
}

// Pet service.
service PetService {
  option deprecated = false;
  rpc GetPet(GetPetRequest) returns (Pet);
  rpc WatchPets(stream WatchPetsRequest) returns (stream .acme.pets.v1.Pet) {
    option idempotency_level = NO_SIDE_EFFECTS;
  }
}
`;

describe('Protobuf parser', () => {
  it('parses proto3 files into a plain tree', () => {
    const { data, diagnostics } = parseProtobuf(source);

    expect(diagnostics).toEqual([]);
    expect(data).toMatchObject({
      syntax: 'proto3',
      package: 'acme.pets.v1',
      imports: [{ path: 'google/protobuf/timestamp.proto' }, { path: 'other.proto', modifier: 'public' }],
      options: { java_package: 'com.acme.pets', '(custom.opt).enabled': true },
      enums: [],
    });
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);

    const [pet] = data.messages;
    expect(pet.comment).toBe('A pet.');
    expect(pet.fields).toEqual([
      { name: 'id', type: 'string', number: 1, options: {}, comment: 'The id.' },
      {
        name: 'tags',
        type: 'string',
        number: 2,
        label: 'repeated',
        options: { deprecated: true, json_name: 'labels' },
      },
      { name: 'counts', type: 'map<string, int32>', keyType: 'string', valueType: 'int32', number: 3, options: {} },
      { name: 'born_at', type: 'google.protobuf.Timestamp', number: 4, label: 'optional', options: {} },
    ]);
    expect(pet.oneofs).toEqual([
      {
        name: 'owner',
        options: {},
        fields: [
          { name: 'person', type: 'string', number: 5, options: {} },
          { name: 'org_id', type: 'int64', number: 6, options: {} },
        ],
      },
    ]);
    expect(pet.reserved).toEqual({
      ranges: [
        { start: 8, end: 8 },
        { start: 10, end: 12 },
        { start: 100, end: 'max' },
      ],
      names: ['old', 'older'],
    });
    expect(pet.messages[0]).toMatchObject({ name: 'Nested', fields: [{ name: 'x', number: 1 }] });
    expect(pet.messages[0].fields[0]).not.toHaveProperty('comment');
    expect(pet.messages[0].fields[0].trailingComment).toBe('trailing');
    expect(pet.enums[0]).toEqual({
      name: 'Kind',
      options: { allow_alias: true },
      values: [
        { name: 'KIND_UNSPECIFIED', number: 0, options: {} },
        { name: 'KIND_DOG', number: 1, options: { deprecated: true }, comment: 'Dogs.' },
      ],
      reserved: { ranges: [{ start: 5, end: 5 }], names: [] },
    });
    expect(data.services).toEqual([
      {
        name: 'PetService',
        comment: 'Pet service.',
        options: { deprecated: false },
        rpcs: [
          {
            name: 'GetPet',
            requestType: 'GetPetRequest',
            requestStream: false,
            responseType: 'Pet',
            responseStream: false,
            options: {},
          },
          {
            name: 'WatchPets',
            requestType: 'WatchPetsRequest',
            requestStream: true,
            responseType: '.acme.pets.v1.Pet',
            responseStream: true,
            options: { idempotency_level: 'NO_SIDE_EFFECTS' },
          },
        ],
      },
    ]);
  });

  it('defaults to proto2 and supports proto2 constructs', () => {
    const { data, diagnostics } = parseProtobuf(`message A {
  required int32 a = 1 [default = -5];
  optional group Result = 2 { optional string url = 3; }
  extensions 100 to 199;
}
extend A { optional int32 b = 100; }
`);
    expect(diagnostics).toEqual([]);
    expect(data.syntax).toBe('proto2');
    expect(data.messages[0].fields).toEqual([
      { name: 'a', type: 'int32', number: 1, label: 'required', options: { default: -5 } },
      { name: 'result', type: 'Result', number: 2, label: 'optional', options: {} },
    ]);
    expect(data.messages[0].messages[0]).toMatchObject({ name: 'Result', fields: [{ name: 'url' }] });
    expect(data.messages[0].extensions).toEqual([{ start: 100, end: 199 }]);
    expect(data.extends).toEqual([
      { extendee: 'A', fields: [{ name: 'b', type: 'int32', number: 100, label: 'optional', options: {} }] },
    ]);
  });

  it('supports editions', () => {
    const { data } = parseProtobuf('edition = "2023";\npackage a;');
    expect(data).toMatchObject({ syntax: 'editions', edition: '2023', package: 'a' });
  });

  it('maps JSON paths to ranges', () => {
    const result = parseProtobuf(source);
    const range = (path: (string | number)[], closest?: boolean) =>
      Protobuf.getLocationForJsonPath(result, path, closest)?.range;

    expect(range(['package'])).toEqual({ start: { line: 4, character: 8 }, end: { line: 4, character: 20 } });
    expect(range(['messages', 0, 'name'])).toEqual({
      start: { line: 13, character: 8 },
      end: { line: 13, character: 11 },
    });
    expect(range(['messages', 0])).toEqual({ start: { line: 13, character: 0 }, end: { line: 37, character: 1 } });
    expect(range(['messages', 0, 'fields', 1, 'options', 'deprecated'])).toEqual({
      start: { line: 16, character: 28 },
      end: { line: 16, character: 45 },
    });
    expect(range(['messages', 0, 'oneofs', 0, 'fields', 1, 'number'])).toEqual({
      start: { line: 21, character: 19 },
      end: { line: 21, character: 20 },
    });
    expect(range(['services', 0, 'rpcs', 1, 'responseType'])).toEqual({
      start: { line: 43, character: 57 },
      end: { line: 43, character: 74 },
    });
    expect(range(['messages', 0, 'comment'])).toBeUndefined();
    expect(range(['messages', 0, 'fields', 1, 'comment'], true)).toEqual({
      start: { line: 16, character: 2 },
      end: { line: 16, character: 69 },
    });
    expect(range(['nope'], true)).toEqual({ start: { line: 0, character: 0 }, end: { line: 47, character: 0 } });
  });

  it('reports syntax errors as diagnostics and recovers', () => {
    const { data, diagnostics } = parseProtobuf(`syntax = "proto3";
message A {
  string a = ;
  int32 b = 2;
}
message B {
  string c = 1
}
enum E { X = 0; }
`);

    expect(diagnostics).toEqual([
      {
        code: 'parser',
        message: 'Expected integer but found ";"',
        range: { start: { line: 2, character: 13 }, end: { line: 2, character: 14 } },
        severity: DiagnosticSeverity.Error,
      },
      {
        code: 'parser',
        message: 'Expected ";" but found "}"',
        range: { start: { line: 7, character: 0 }, end: { line: 7, character: 1 } },
        severity: DiagnosticSeverity.Error,
      },
    ]);
    expect(data.messages.map(({ name, fields }) => [name, fields.map(({ name }) => name)])).toEqual([
      ['A', ['b']],
      ['B', []],
    ]);
    expect(data.enums[0].values[0].name).toBe('X');
  });

  it('captures same-line trailing comments', () => {
    const { data, diagnostics } = parseProtobuf(`// Leading.
message A { // A trailing.
  // a leading.
  int32 a = 1; /* a trailing. */ // more
  // b leading.
  int32 b = 2;
  // detached

  oneof o { int32 c = 3; } // o trailing.
}
enum E { E_X = 0; } // E trailing.
service S {
  rpc R(A) returns (A); // R trailing.
  rpc T(A) returns (A) { // T trailing.
  }
}
`);
    expect(diagnostics).toEqual([]);
    const [a] = data.messages;
    expect(a).toMatchObject({ comment: 'Leading.', trailingComment: 'A trailing.' });
    expect(a.fields).toEqual([
      expect.objectContaining({ name: 'a', comment: 'a leading.', trailingComment: 'a trailing.\nmore' }),
      expect.objectContaining({ name: 'b', comment: 'b leading.' }),
    ]);
    expect(a.fields[1]).not.toHaveProperty('trailingComment');
    expect(a.oneofs[0]).toMatchObject({ trailingComment: 'o trailing.' });
    expect(a.oneofs[0]).not.toHaveProperty('comment');
    expect(a.oneofs[0].fields[0]).not.toHaveProperty('trailingComment');
    expect(data.enums[0]).toMatchObject({ trailingComment: 'E trailing.' });
    expect(data.enums[0].values[0]).not.toHaveProperty('trailingComment');
    expect(data.services[0].rpcs).toEqual([
      expect.objectContaining({ name: 'R', trailingComment: 'R trailing.' }),
      expect.objectContaining({ name: 'T', trailingComment: 'T trailing.' }),
    ]);
    expect(data.services[0]).not.toHaveProperty('trailingComment');
  });

  it('parses aggregate option values', () => {
    const { data, diagnostics } = parseProtobuf(`
option (a) = { name: "x" "y" count: -3 ratio: 1.5 on: true kind: FOO nested { deep: [1, 2] } list: [{ a: 1 }, { a: 2 }] };
option (b) = { rep: 1 rep: 2, rep: [3]; [ext.field]: "e" [type.googleapis.com/foo.Bar] < v: 1 > };
option (c) = {};
option (d) = { broken: };
message M {
  string f = 1 [(validate.rules).string = { min_len: 1, max_len: 10 }];
}
`);
    expect(diagnostics).toEqual([]);
    expect(data.options).toEqual({
      '(a)': {
        name: 'xy',
        count: -3,
        ratio: 1.5,
        on: true,
        kind: 'FOO',
        nested: { deep: [1, 2] },
        list: [{ a: 1 }, { a: 2 }],
      },
      '(b)': { rep: [1, 2, 3], '[ext.field]': 'e', '[type.googleapis.com/foo.Bar]': { v: 1 } },
      '(c)': {},
      '(d)': '{ broken : }',
    });
    expect(data.messages[0].fields[0].options).toEqual({
      '(validate.rules).string': { min_len: 1, max_len: 10 },
    });
  });

  it('warns about unknown syntax and edition values', () => {
    expect(parseProtobuf('syntax = "proto4";').diagnostics).toEqual([
      {
        code: 'parser',
        message: 'Unknown syntax "proto4", expected "proto2" or "proto3"',
        range: { start: { line: 0, character: 9 }, end: { line: 0, character: 17 } },
        severity: DiagnosticSeverity.Warning,
      },
    ]);
    expect(parseProtobuf('edition = "next";').diagnostics).toEqual([
      expect.objectContaining({
        message: 'Unknown edition "next", expected a year such as "2023"',
        severity: DiagnosticSeverity.Warning,
      }),
    ]);
    expect(parseProtobuf('syntax = "proto2";').diagnostics).toEqual([]);
    expect(parseProtobuf('edition = "2024";').diagnostics).toEqual([]);
  });

  it('reports unterminated blocks', () => {
    const { data, diagnostics } = parseProtobuf('message A {\n  int32 a = 1;\n');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toBe('Expected "}" but found end of file');
    expect(data.messages[0].fields).toHaveLength(1);
  });
});

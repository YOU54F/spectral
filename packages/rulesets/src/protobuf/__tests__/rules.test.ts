import { DiagnosticSeverity } from '@stoplight/types';
import testRule, { proto } from './__helpers__/tester';
import { valid } from './__helpers__/valid';

const range = (line: number, start: number, end: number) => ({
  start: { line, character: start },
  end: { line, character: end },
});

testRule('protobuf-package-defined', [
  { name: 'package is declared', document: proto(valid), errors: [] },
  {
    name: 'package is missing',
    document: proto('syntax = "proto3";\n'),
    errors: [{ message: 'Files must declare a package.', path: ['package'], severity: DiagnosticSeverity.Warning }],
  },
]);

testRule('protobuf-type-names-pascal-case', [
  { name: 'PascalCase names', document: proto(valid), errors: [] },
  {
    name: 'other casing',
    document: proto('message pet_info { message inner {} }\nenum KIND { A = 0; }\nservice pets {}\n'),
    errors: [
      { message: 'Name "pet_info" must be PascalCase.', path: ['messages', '0', 'name'], range: range(0, 8, 16) },
      { message: 'Name "inner" must be PascalCase.', path: ['messages', '0', 'messages', '0', 'name'] },
      { message: 'Name "KIND" must be PascalCase.', path: ['enums', '0', 'name'] },
      { message: 'Name "pets" must be PascalCase.', path: ['services', '0', 'name'] },
    ],
  },
]);

testRule('protobuf-field-names-lower-snake-case', [
  { name: 'lower_snake_case fields', document: proto(valid), errors: [] },
  {
    name: 'camelCase fields, also in oneofs and nested messages',
    document: proto(
      'message A {\n  string petId = 1;\n  oneof o { int32 Other = 2; }\n  message B { map<string, int32> byName = 1; }\n}\n',
    ),
    errors: [
      {
        message: 'Field name "petId" must be lower_snake_case.',
        path: ['messages', '0', 'fields', '0', 'name'],
        range: range(1, 9, 14),
      },
      {
        message: 'Field name "Other" must be lower_snake_case.',
        path: ['messages', '0', 'oneofs', '0', 'fields', '0', 'name'],
      },
      {
        message: 'Field name "byName" must be lower_snake_case.',
        path: ['messages', '0', 'messages', '0', 'fields', '0', 'name'],
      },
    ],
  },
]);

testRule('protobuf-enum-value-names', [
  { name: 'prefixed UPPER_SNAKE_CASE values', document: proto(valid), errors: [] },
  {
    name: 'unprefixed and wrongly cased values',
    document: proto('enum HTTPStatus {\n  HTTP_STATUS_UNSPECIFIED = 0;\n  OK = 1;\n  http_status_bad = 2;\n}\n'),
    errors: [
      {
        message: 'Enum value "OK" must be prefixed with "HTTP_STATUS_".',
        path: ['enums', '0', 'values', '1', 'name'],
        range: range(2, 2, 4),
      },
      {
        message: 'Enum value "http_status_bad" must be UPPER_SNAKE_CASE.',
        path: ['enums', '0', 'values', '2', 'name'],
      },
    ],
  },
]);

testRule('protobuf-enum-zero-value-unspecified', [
  { name: 'zero value is *_UNSPECIFIED', document: proto(valid), errors: [] },
  {
    name: 'zero value has another name',
    document: proto('message M {\n  enum Kind { KIND_NONE = 0; KIND_A = 1; }\n}\n'),
    errors: [
      {
        message: 'Enum zero value "KIND_NONE" must be suffixed with "_UNSPECIFIED".',
        path: ['messages', '0', 'enums', '0', 'values', '0', 'name'],
        range: range(1, 14, 23),
      },
    ],
  },
]);

testRule('protobuf-rpc-request-response-names', [
  { name: '<Rpc>Request and <Rpc>Response', document: proto(valid), errors: [] },
  {
    name: '<Service><Rpc>Request and fully-qualified names are fine',
    document: proto('service Pets { rpc Get(PetsGetRequest) returns (.a.b.GetResponse); }'),
    errors: [],
  },
  {
    name: 'other names',
    document: proto('service Pets {\n  rpc Get(Pet) returns (stream google.protobuf.Empty);\n}\n'),
    errors: [
      {
        message: 'RPC "Get" request type must be named "GetRequest".',
        path: ['services', '0', 'rpcs', '0', 'requestType'],
        range: range(1, 10, 13),
      },
      {
        message: 'RPC "Get" response type must be named "GetResponse".',
        path: ['services', '0', 'rpcs', '0', 'responseType'],
        range: range(1, 31, 52),
      },
    ],
  },
]);

testRule('protobuf-comments', [
  { name: 'everything is commented', document: proto(valid), errors: [] },
  {
    name: 'missing comments',
    document: proto(
      '// Svc.\nservice S {\n  rpc Get(GetRequest) returns (GetResponse);\n}\n\n// detached\n\nmessage GetRequest {}\n',
    ),
    errors: [
      {
        message: 'RPC "Get" must have a leading comment.',
        path: ['services', '0', 'rpcs', '0', 'name'],
        range: range(2, 6, 9),
      },
      { message: 'Message "GetRequest" must have a leading comment.', path: ['messages', '0', 'name'] },
    ],
  },
]);

testRule('protobuf-field-number-range', [
  { name: 'regular numbers', document: proto(valid), errors: [] },
  {
    name: 'reserved and out of range numbers',
    document: proto('message A {\n  int32 a = 19000;\n  int32 b = 536870912;\n  int32 c = 0;\n}\n'),
    errors: [
      {
        message: 'Field number 19000 is in the 19000-19999 range reserved by Protobuf.',
        path: ['messages', '0', 'fields', '0', 'number'],
        range: range(1, 12, 17),
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Field number 536870912 must be between 1 and 536870911.',
        path: ['messages', '0', 'fields', '1', 'number'],
      },
      { message: 'Field number 0 must be between 1 and 536870911.', path: ['messages', '0', 'fields', '2', 'number'] },
    ],
  },
]);

testRule('protobuf-field-numbers-unique', [
  { name: 'unique numbers', document: proto(valid), errors: [] },
  {
    name: 'duplicate and reserved numbers, also in oneofs and nested messages',
    document: proto(
      'message A {\n  reserved 4, 10 to 12, 100 to max;\n  int32 a = 1;\n  int32 b = 1;\n  oneof o { int32 c = 1; int32 d = 11; }\n  int32 e = 4;\n  int32 f = 200;\n  message B { int32 a = 1; int32 b = 1; }\n}\n',
    ),
    errors: [
      {
        message: 'Field number 1 of field "b" is already used by field "a".',
        path: ['messages', '0', 'fields', '1', 'number'],
        range: range(3, 12, 13),
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Field number 1 of field "c" is already used by field "a".',
        path: ['messages', '0', 'oneofs', '0', 'fields', '0', 'number'],
      },
      {
        message: 'Field number 11 of field "d" is reserved.',
        path: ['messages', '0', 'oneofs', '0', 'fields', '1', 'number'],
      },
      {
        message: 'Field number 4 of field "e" is reserved.',
        path: ['messages', '0', 'fields', '2', 'number'],
      },
      {
        message: 'Field number 200 of field "f" is reserved.',
        path: ['messages', '0', 'fields', '3', 'number'],
      },
      {
        message: 'Field number 1 of field "b" is already used by field "a".',
        path: ['messages', '0', 'messages', '0', 'fields', '1', 'number'],
      },
    ],
  },
]);

testRule('protobuf-field-names-unique', [
  { name: 'unique names', document: proto(valid), errors: [] },
  {
    name: 'duplicate and reserved names, also in oneofs',
    document: proto(
      'message A {\n  reserved "old", "older";\n  int32 a = 1;\n  int32 a = 2;\n  oneof o { int32 a = 3; }\n  int32 old = 4;\n}\n',
    ),
    errors: [
      {
        message: 'Field name "a" is already used in message "A".',
        path: ['messages', '0', 'fields', '1', 'name'],
        range: range(3, 8, 9),
        severity: DiagnosticSeverity.Error,
      },
      {
        message: 'Field name "a" is already used in message "A".',
        path: ['messages', '0', 'oneofs', '0', 'fields', '0', 'name'],
      },
      { message: 'Field name "old" is reserved.', path: ['messages', '0', 'fields', '2', 'name'] },
    ],
  },
]);

testRule('protobuf-enum-value-numbers-unique', [
  { name: 'unique numbers', document: proto(valid), errors: [] },
  {
    name: 'aliases are allowed with allow_alias',
    document: proto('enum E {\n  option allow_alias = true;\n  E_UNSPECIFIED = 0;\n  E_DEFAULT = 0;\n}\n'),
    errors: [],
  },
  {
    name: 'duplicate and reserved numbers',
    document: proto(
      'enum E {\n  reserved 5 to max;\n  E_UNSPECIFIED = 0;\n  E_DEFAULT = 0;\n  E_BIG = 7;\n}\nmessage M { enum F { option allow_alias = false; F_A = 0; F_B = 0; } }\n',
    ),
    errors: [
      {
        message:
          'Enum value number 0 of "E_DEFAULT" is already used by "E_UNSPECIFIED"; set "option allow_alias = true;" to allow aliases.',
        path: ['enums', '0', 'values', '1', 'number'],
        range: range(3, 14, 15),
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Enum value number 7 of "E_BIG" is reserved.', path: ['enums', '0', 'values', '2', 'number'] },
      {
        message:
          'Enum value number 0 of "F_B" is already used by "F_A"; set "option allow_alias = true;" to allow aliases.',
        path: ['messages', '0', 'enums', '0', 'values', '1', 'number'],
      },
    ],
  },
]);

testRule('protobuf-enum-value-names-unique', [
  { name: 'unique names', document: proto(valid), errors: [] },
  {
    name: 'duplicate and reserved names',
    document: proto('enum E {\n  reserved "E_OLD";\n  E_A = 0;\n  E_A = 1;\n  E_OLD = 2;\n}\n'),
    errors: [
      {
        message: 'Enum value name "E_A" is already used in enum "E".',
        path: ['enums', '0', 'values', '1', 'name'],
        range: range(3, 2, 5),
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Enum value name "E_OLD" is reserved.', path: ['enums', '0', 'values', '2', 'name'] },
    ],
  },
]);

testRule('protobuf-type-names-unique', [
  { name: 'unique names', document: proto(valid), errors: [] },
  {
    name: 'same names in different scopes are fine',
    document: proto('message A { message B {} }\nmessage B { message B {} }\n'),
    errors: [],
  },
  {
    name: 'duplicate names in the same scope',
    document: proto(
      'message A {}\nenum A { A_UNSPECIFIED = 0; }\nservice A {}\nmessage B { message C {} enum C { C_X = 0; } }\n',
    ),
    errors: [
      {
        message: 'Type name "A" is already defined in this scope.',
        path: ['enums', '0', 'name'],
        range: range(1, 5, 6),
        severity: DiagnosticSeverity.Error,
      },
      { message: 'Type name "A" is already defined in this scope.', path: ['services', '0', 'name'] },
      {
        message: 'Type name "C" is already defined in this scope.',
        path: ['messages', '1', 'enums', '0', 'name'],
      },
    ],
  },
]);

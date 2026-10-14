# Protobuf Rules

Spectral has a built-in "protobuf" ruleset for [Protocol Buffers](https://protobuf.dev/) files, modelled on the [Buf](https://buf.build/docs/lint/rules) style guide.

In your ruleset file you can add `extends: "spectral:protobuf"` and you'll get all of the following rules applied to your `.proto` files.

### protobuf-package-defined

Files must declare a package.

**Recommended:** Yes

### protobuf-type-names-pascal-case

Message, enum and service names must be PascalCase.

**Recommended:** Yes

**Bad Example**

```protobuf
message pet_info {}
```

**Good Example**

```protobuf
message PetInfo {}
```

### protobuf-field-names-lower-snake-case

Field names must be lower_snake_case.

**Recommended:** Yes

**Bad Example**

```protobuf
message Pet {
  string petId = 1;
}
```

**Good Example**

```protobuf
message Pet {
  string pet_id = 1;
}
```

### protobuf-enum-value-names

Enum value names must be UPPER_SNAKE_CASE and prefixed with the UPPER_SNAKE_CASE enum name.

**Recommended:** Yes

**Bad Example**

```protobuf
enum PetKind {
  UNKNOWN = 0;
  dog = 1;
}
```

**Good Example**

```protobuf
enum PetKind {
  PET_KIND_UNSPECIFIED = 0;
  PET_KIND_DOG = 1;
}
```

### protobuf-enum-zero-value-unspecified

The zero value of an enum must be suffixed with `_UNSPECIFIED`, so that an unset field is distinguishable from a meaningful value.

**Recommended:** Yes

**Bad Example**

```protobuf
enum PetKind {
  PET_KIND_DOG = 0;
}
```

**Good Example**

```protobuf
enum PetKind {
  PET_KIND_UNSPECIFIED = 0;
  PET_KIND_DOG = 1;
}
```

### protobuf-rpc-request-response-names

RPC request and response types must be named `<Rpc>Request` and `<Rpc>Response` (or `<Service><Rpc>Request` and `<Service><Rpc>Response`), so each RPC can evolve its messages independently.

**Recommended:** Yes

**Bad Example**

```protobuf
service PetService {
  rpc GetPet(Pet) returns (google.protobuf.Empty);
}
```

**Good Example**

```protobuf
service PetService {
  rpc GetPet(GetPetRequest) returns (GetPetResponse);
}
```

### protobuf-comments

Services, RPCs and messages must have a leading comment, placed directly above the declaration with no blank line in between.

Only leading comments count, as in Buf's `COMMENT_*` rules: a trailing comment on the same line (`message Pet {} // A pet.`) does not satisfy this rule. The parser still exposes it as `trailingComment` for your own rules.

**Recommended:** Yes

**Good Example**

```protobuf
// Manages pets.
service PetService {
  // Gets a pet by ID.
  rpc GetPet(GetPetRequest) returns (GetPetResponse);
}
```

### protobuf-field-number-range

Field numbers must be between 1 and 536870911 and outside the 19000-19999 range reserved by the Protobuf implementation.

**Recommended:** Yes

**Bad Example**

```protobuf
message Pet {
  string name = 19000;
}
```

### protobuf-field-numbers-unique

Field numbers must be unique within a message, including the fields of its oneofs, and must not fall in a `reserved` range.

**Recommended:** Yes

**Bad Example**

```protobuf
message Pet {
  reserved 3, 10 to max;
  string name = 1;
  oneof owner {
    string person = 1;
  }
  string nickname = 3;
}
```

**Good Example**

```protobuf
message Pet {
  reserved 3, 10 to max;
  string name = 1;
  oneof owner {
    string person = 2;
  }
  string nickname = 4;
}
```

### protobuf-field-names-unique

Field names must be unique within a message, including the fields of its oneofs, and must not be a `reserved` name.

**Recommended:** Yes

**Bad Example**

```protobuf
message Pet {
  reserved "old_name";
  string name = 1;
  string name = 2;
  string old_name = 3;
}
```

### protobuf-enum-value-numbers-unique

Enum value numbers must be unique within an enum, unless the enum sets `option allow_alias = true;`, and must not fall in a `reserved` range.

**Recommended:** Yes

**Bad Example**

```protobuf
enum PetKind {
  reserved 5 to max;
  PET_KIND_UNSPECIFIED = 0;
  PET_KIND_DEFAULT = 0;
  PET_KIND_DOG = 7;
}
```

**Good Example**

```protobuf
enum PetKind {
  option allow_alias = true;
  PET_KIND_UNSPECIFIED = 0;
  PET_KIND_DEFAULT = 0;
}
```

### protobuf-enum-value-names-unique

Enum value names must be unique within an enum and must not be a `reserved` name.

**Recommended:** Yes

**Bad Example**

```protobuf
enum PetKind {
  reserved "PET_KIND_CAT";
  PET_KIND_UNSPECIFIED = 0;
  PET_KIND_CAT = 1;
}
```

### protobuf-symbol-names-unique

Names declared in the same scope must not clash, as protoc puts them all in one symbol table. A scope is the file (messages, enums, services and extensions declared at the top level), a message (its fields, oneofs, nested messages and enums, and extensions declared in it) or a service (its RPCs). The same name in different scopes, such as `Pet.Kind` and `Owner.Kind`, is fine, and names are case-sensitive, so a field `pet` next to a message `Pet` is fine too.

Enum values follow C++ scoping rules: they are siblings of their enum, not children of it. Two enums in the same scope can therefore not share a value name, and an enum value can not have the name of a message, field or the enum itself in that scope. This is why enum values are usually prefixed with the enum name.

The declaration that comes second in the file is reported. Duplicate field names and duplicate value names within one enum are reported by `protobuf-field-names-unique` and `protobuf-enum-value-names-unique` instead.

**Recommended:** Yes

**Bad Example**

```protobuf
message Pet {}
enum Pet {
  PET_UNSPECIFIED = 0;
}

enum Color {
  UNKNOWN = 0;
}
enum Size {
  UNKNOWN = 0;
}
```

**Good Example**

```protobuf
enum Color {
  COLOR_UNSPECIFIED = 0;
}
enum Size {
  SIZE_UNSPECIFIED = 0;
}
```

### protobuf-editions-legacy-syntax

Editions files (`edition = "2023";` or later) must not use syntax that editions replaced with features, which protoc rejects:

- the `required` label: use `[features.field_presence = LEGACY_REQUIRED]`;
- the `optional` label: fields have explicit presence by default (see `features.field_presence`);
- `group` fields: use a message field with `[features.message_encoding = DELIMITED]`;
- the `packed` field option: use `features.repeated_field_encoding`.

**Recommended:** Yes

**Bad Example**

```protobuf
edition = "2023";

message Pet {
  required string name = 1;
  repeated int32 scores = 2 [packed = false];
}
```

**Good Example**

```protobuf
edition = "2023";

message Pet {
  string name = 1 [features.field_presence = LEGACY_REQUIRED];
  repeated int32 scores = 2 [features.repeated_field_encoding = EXPANDED];
}
```

### protobuf-field-default-allowed

The `default` field option is only allowed where protoc accepts it: not in proto3 files, not on repeated (or map) fields, and in editions files not on fields with implicit presence. Implicit presence is resolved from the `features.field_presence` feature of the field, its enclosing messages and the file; oneof fields and extensions are not checked, as they always have explicit presence.

**Recommended:** Yes

**Bad Example**

```protobuf
edition = "2023";

option features.field_presence = IMPLICIT;

message Pet {
  int32 age = 1 [default = 1];
}
```

**Good Example**

```protobuf
edition = "2023";

message Pet {
  int32 age = 1 [default = 1];
}
```

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

### protobuf-type-names-unique

Messages, enums and services declared in the same scope (directly in the file, or directly in a message) must have unique names. The same name in different scopes, such as `Pet.Kind` and `Owner.Kind`, is fine.

**Recommended:** Yes

**Bad Example**

```protobuf
message Pet {}
enum Pet {
  PET_UNSPECIFIED = 0;
}
```

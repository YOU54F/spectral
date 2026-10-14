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

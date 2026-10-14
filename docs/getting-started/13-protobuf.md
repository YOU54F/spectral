# Protobuf Support

Spectral has a built-in [Protocol Buffers](https://protobuf.dev/) ruleset that you can use to lint your `.proto` files. It supports proto3, proto2 and editions syntax.

Add `extends: "spectral:protobuf"` to your ruleset file to lint Protobuf files:

```bash
echo 'extends: ["spectral:protobuf"]' > .spectral.yaml
spectral lint "protos/**/*.proto"
```

The ruleset registers a Protobuf parser for files with the `.proto` extension, so you don't need any extra configuration. Syntax errors are reported as `parser` results with the exact location of the problem. An unknown `syntax` (anything other than `"proto2"` or `"proto3"`) or `edition` (anything that is not a year such as `"2023"`) is reported as a `parser` warning.

## Data Model

The Protobuf parser turns a `.proto` file into a plain JSON tree, which is what your own rules target with JSONPath `given` expressions:

```yaml
syntax: proto3 # proto2 (the default when no syntax is declared), proto3 or editions
edition: "2023" # only for editions files
package: acme.pets.v1 # null when missing
imports: [{ path: google/protobuf/empty.proto, modifier: public }] # modifier is optional
options: # option name -> value
  java_package: com.acme.pets
  (acme.meta): { owner: pets-team, tags: [a, b] } # aggregate values `{ ... }` become objects
messages:
  - name: Pet
    comment: A pet. # leading comment, when present
    trailingComment: Trailing. # same-line trailing comment, when present
    fields:
      - { name: pet_id, type: string, number: 1, label: optional, options: {} }
      - { name: tags, type: "map<string, string>", keyType: string, valueType: string, number: 2, options: {} }
    oneofs: [{ name: owner, fields: [], options: {} }]
    messages: [] # nested messages
    enums: [] # nested enums
    extends: []
    reserved: { ranges: [{ start: 5, end: max }], names: [old_field] }
    extensions: []
    options: {}
enums:
  - name: PetKind
    values: [{ name: PET_KIND_UNSPECIFIED, number: 0, options: {} }]
    reserved: { ranges: [], names: [] }
    options: {}
services:
  - name: PetService
    rpcs:
      - { name: GetPet, requestType: GetPetRequest, requestStream: false, responseType: GetPetResponse, responseStream: false, options: {} }
    options: {}
extends: [] # top-level extend blocks
```

For example, this rule requires every message to have a leading comment:

```yaml
extends: ["spectral:protobuf"]
formats: [protobuf]
rules:
  message-comment:
    given: "$..messages[*]"
    then:
      field: comment
      function: truthy
```

You can see a full list of the rules in this ruleset in [Protobuf Rules](../reference/protobuf-rules.md).

## Parser Details

Comments: every declaration has an optional `comment` (the comments directly above it, with no blank line in between) and `trailingComment` (a comment on the same line, after its `;` or opening `{`; for a block it may also follow the closing `}`). Detached comments, separated from the declaration by a blank line, are dropped. The built-in `protobuf-comments` rule only accepts leading comments, like Buf.

Aggregate option values (`option (foo) = { a: 1, b { c: "x" }, d: [1, 2] }`) are parsed as text-format message literals into objects. A field written several times becomes an array, and extension or `Any` keys keep their brackets, e.g. `"[foo.ext]"`. If a value cannot be parsed, it is kept as raw text.

## Limitations

The parser is syntactic only: it does not resolve imports or type references, and editions features are not validated. Imports are not followed because Spectral's resolver works on JSON `$ref`s, which Protobuf files do not have, so rules only ever see one `.proto` file at a time. As a consequence, duplicate checks only cover what is declared in a single file.

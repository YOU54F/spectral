import { createRulesetFunction } from '@stoplight/spectral-core';
import type { IFunctionResult } from '@stoplight/spectral-core';
import type { ProtobufEnum, ProtobufExtend, ProtobufField, ProtobufOneof } from '@stoplight/spectral-parsers';
import type { JsonPath } from '@stoplight/types';

// A file, a message or a service: anything that declares symbols directly in its own scope.
type Scope = {
  messages?: { name: string }[];
  enums?: ProtobufEnum[];
  services?: { name: string }[];
  fields?: ProtobufField[];
  oneofs?: ProtobufOneof[];
  extends?: ProtobufExtend[];
  rpcs?: { name: string }[];
};

type Declaration = {
  name: string;
  // e.g. 'message "Pet"' or 'enum value "A" of enum "E"'
  label: string;
  // relative to the scope
  path: JsonPath;
  // declarations of the same group are compared by another rule (field and enum value names) and skipped here
  group?: string;
  enumValue?: true;
};

const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

// Everything protoc registers in the symbol table of a scope. Fields (also those of oneofs), oneofs and nested types
// share the message scope, extensions belong to the scope their `extend` block is in, and enum values follow C++
// scoping rules: they are siblings of their enum, not children of it.
function declarations(scope: Scope): Declaration[] {
  const result: Declaration[] = [];
  const add = (name: unknown, label: string, path: JsonPath, extra: Partial<Declaration> = {}): void => {
    if (typeof name === 'string') result.push({ name, label: `${label} "${name}"`, path, ...extra });
  };

  list(scope.messages).forEach(({ name }, i) => add(name, 'message', ['messages', i, 'name']));
  list(scope.enums).forEach((enumType, i) => {
    add(enumType.name, 'enum', ['enums', i, 'name']);
    list(enumType.values).forEach(({ name }, j) => {
      add(name, 'enum value', ['enums', i, 'values', j, 'name'], { group: `enums.${i}`, enumValue: true });
      if (typeof name === 'string') result[result.length - 1].label += ` of enum "${enumType.name}"`;
    });
  });
  list(scope.services).forEach(({ name }, i) => add(name, 'service', ['services', i, 'name']));
  list(scope.fields).forEach(({ name }, i) => add(name, 'field', ['fields', i, 'name'], { group: 'fields' }));
  list(scope.oneofs).forEach((oneof, i) => {
    add(oneof.name, 'oneof', ['oneofs', i, 'name']);
    list(oneof.fields).forEach(({ name }, j) =>
      add(name, 'field', ['oneofs', i, 'fields', j, 'name'], { group: 'fields' }),
    );
  });
  list(scope.extends).forEach((extend, i) =>
    list(extend.fields).forEach(({ name }, j) => add(name, 'extension', ['extends', i, 'fields', j, 'name'])),
  );
  list(scope.rpcs).forEach(({ name }, i) => add(name, 'RPC', ['rpcs', i, 'name']));

  return result;
}

const capitalize = (text: string): string => `${text[0].toUpperCase()}${text.slice(1)}`;

export default createRulesetFunction<Scope, null>(
  {
    input: null,
    options: null,
  },
  function protobufSymbolNamesUnique(targetVal, _opts, ctx) {
    const results: IFunctionResult[] = [];
    const seen = new Map<string, Declaration>();

    // Declarations are compared in source order, so that the one declared second is reported, whatever its kind.
    const position = (path: JsonPath): [number, number] => {
      const start = ctx.document.getRangeForJsonPath([...ctx.path, ...path])?.start;
      return start === void 0 ? [Infinity, Infinity] : [start.line, start.character];
    };
    const sorted = declarations(targetVal)
      .map(declaration => ({ declaration, at: position(declaration.path) }))
      .sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1])
      .map(({ declaration }) => declaration);

    for (const declaration of sorted) {
      const other = seen.get(declaration.name);
      if (other === void 0) {
        seen.set(declaration.name, declaration);
        continue;
      }

      if (declaration.group !== void 0 && declaration.group === other.group) continue;

      results.push({
        message:
          `${capitalize(declaration.label)} clashes with ${other.label} in the same scope.` +
          (declaration.enumValue === true || other.enumValue === true
            ? ' Enum values are siblings of their enum, not children of it, so their names must be unique in the scope that contains the enum.'
            : ''),
        path: [...ctx.path, ...declaration.path],
      });
    }

    return results;
  },
);

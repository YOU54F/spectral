import type {
  ProtobufDocument,
  ProtobufExtend,
  ProtobufField,
  ProtobufMessage,
  ProtobufOptions,
  ProtobufTextValue,
} from '@stoplight/spectral-parsers';
import type { JsonPath } from '@stoplight/types';

// PetKind -> PET_KIND, HTTPStatus -> HTTP_STATUS, v2Thing -> V2_THING
export function toUpperSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

// .acme.pets.v1.GetPetRequest -> GetPetRequest
export function lastSegment(type: string): string {
  return type.slice(type.lastIndexOf('.') + 1);
}

// Whether a number falls in one of the given (inclusive) reserved ranges, e.g. `reserved 2, 5 to 9, 100 to max;`
export function inReservedRange(value: number, ranges: { start: number; end: number | 'max' }[]): boolean {
  return ranges.some(({ start, end }) => value >= start && (end === 'max' || value <= end));
}

export type FieldVisit = {
  field: ProtobufField;
  // absolute path of the field
  path: JsonPath;
  // options of the enclosing declarations, outermost (the file) first, that features are inherited from
  scopes: ProtobufOptions[];
  oneof: boolean;
  extension: boolean;
};

const list = <T>(value: T[] | undefined): T[] => (Array.isArray(value) ? value : []);

// Calls `visit` for every field of a file: message fields, oneof fields and extensions, in nested messages too.
export function forEachField(doc: ProtobufDocument, path: JsonPath, visit: (field: FieldVisit) => void): void {
  const extensions = (extendsList: ProtobufExtend[] | undefined, at: JsonPath, scopes: ProtobufOptions[]): void => {
    list(extendsList).forEach((extend, i) =>
      list(extend.fields).forEach((field, j) =>
        visit({ field, path: [...at, 'extends', i, 'fields', j], scopes, oneof: false, extension: true }),
      ),
    );
  };

  const message = (node: ProtobufMessage, at: JsonPath, parentScopes: ProtobufOptions[]): void => {
    const scopes = [...parentScopes, node.options ?? {}];
    list(node.fields).forEach((field, i) =>
      visit({ field, path: [...at, 'fields', i], scopes, oneof: false, extension: false }),
    );
    list(node.oneofs).forEach((oneof, i) =>
      list(oneof.fields).forEach((field, j) =>
        visit({
          field,
          path: [...at, 'oneofs', i, 'fields', j],
          scopes: [...scopes, oneof.options ?? {}],
          oneof: true,
          extension: false,
        }),
      ),
    );
    extensions(node.extends, at, scopes);
    list(node.messages).forEach((nested, i) => message(nested, [...at, 'messages', i], scopes));
  };

  const scopes = [doc.options ?? {}];
  extensions(doc.extends, path, scopes);
  list(doc.messages).forEach((node, i) => message(node, [...path, 'messages', i], scopes));
}

// The value of an editions feature as set by the innermost of the given options, e.g. "IMPLICIT" for
// `option features.field_presence = IMPLICIT;` or `[features = { field_presence: IMPLICIT }]`.
export function resolveFeature(name: string, options: ProtobufOptions[]): ProtobufTextValue | undefined {
  for (let i = options.length - 1; i >= 0; i--) {
    const value = options[i][`features.${name}`];
    if (value !== void 0) return value;
    const features = options[i].features;
    if (typeof features === 'object' && features[name] !== void 0) return features[name];
  }

  return;
}

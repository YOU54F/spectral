import { isTypeExtensionNode, Kind, parse, visit } from 'graphql';
import type { ASTNode, DefinitionNode, DirectiveNode, DocumentNode, ValueNode } from 'graphql';

// The definitions of Apollo Federation 2 (up to v2.9), with their spec names. Names other than the link and
// underscore ones are imported or namespaced by the subgraph's `@link`; see getFederation2Name.
const FEDERATION_2_SDL = `
directive @link(url: String!, as: String, for: link__Purpose, import: [link__Import]) repeatable on SCHEMA
scalar link__Import
enum link__Purpose { SECURITY EXECUTION }
directive @key(fields: FieldSet!, resolvable: Boolean = true) repeatable on OBJECT | INTERFACE
directive @requires(fields: FieldSet!) on FIELD_DEFINITION
directive @provides(fields: FieldSet!) on FIELD_DEFINITION
directive @external(reason: String) on OBJECT | FIELD_DEFINITION
directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION | SCHEMA
directive @extends on OBJECT | INTERFACE
directive @shareable repeatable on OBJECT | FIELD_DEFINITION
directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @override(from: String!, label: String) on FIELD_DEFINITION
directive @composeDirective(name: String!) repeatable on SCHEMA
directive @interfaceObject on OBJECT
directive @authenticated on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @requiresScopes(scopes: [[Scope!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @policy(policies: [[Policy!]!]!) on FIELD_DEFINITION | OBJECT | INTERFACE | SCALAR | ENUM
directive @context(name: String!) repeatable on INTERFACE | OBJECT | UNION
directive @fromContext(field: ContextFieldValue) on ARGUMENT_DEFINITION
directive @cost(weight: Int!) on ARGUMENT_DEFINITION | ENUM | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | OBJECT | SCALAR
directive @listSize(assumedSize: Int, slicingArguments: [String!], sizedFields: [String!], requireOneSlicingArgument: Boolean = true) on FIELD_DEFINITION
scalar FieldSet
scalar Scope
scalar Policy
scalar ContextFieldValue
scalar _Any
type _Service { sdl: String }
`;

// Federation 1 subgraphs use these under their default names, without declaring them.
const FEDERATION_1_SDL = `
directive @key(fields: _FieldSet!) repeatable on OBJECT | INTERFACE
directive @requires(fields: _FieldSet!) on FIELD_DEFINITION
directive @provides(fields: _FieldSet!) on FIELD_DEFINITION
directive @external on FIELD_DEFINITION
directive @extends on OBJECT | INTERFACE
directive @tag(name: String!) repeatable on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
directive @inaccessible on FIELD_DEFINITION | OBJECT | INTERFACE | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION
scalar _FieldSet
scalar _Any
type _Service { sdl: String }
`;

const FEDERATION_2_URL = /^https?:\/\/specs\.apollo\.dev\/federation\/v2\.\d+\/?$/;
const UNNAMESPACED_NAMES = new Set([
  'link',
  'link__Import',
  'link__Purpose',
  '_Any',
  '_Service',
  'String',
  'Int',
  'Boolean',
]);

let federation1Definitions: readonly DefinitionNode[] | undefined;
let federation2Definitions: readonly DefinitionNode[] | undefined;

const getArgument = (directive: DirectiveNode, name: string): ValueNode | undefined =>
  directive.arguments?.find(argument => argument.name.value === name)?.value;
const getString = (value: ValueNode | undefined): string | undefined =>
  value?.kind === Kind.STRING ? value.value : void 0;

// Directive keys start with "@", so they don't clash with type names.
function getDefinitionKey(node: DefinitionNode): string | undefined {
  if (node.kind === Kind.DIRECTIVE_DEFINITION) return `@${node.name.value}`;
  return 'name' in node && node.name !== void 0 && !node.kind.endsWith('Extension') ? node.name.value : void 0;
}

function findFederation2Link(document: DocumentNode): DirectiveNode | undefined {
  for (const definition of document.definitions) {
    if (definition.kind !== Kind.SCHEMA_DEFINITION && definition.kind !== Kind.SCHEMA_EXTENSION) continue;
    const link = definition.directives?.find(
      directive =>
        directive.name.value === 'link' && FEDERATION_2_URL.test(getString(getArgument(directive, 'url')) ?? ''),
    );
    if (link !== void 0) return link;
  }

  return void 0;
}

function usesFederation1(document: DocumentNode): boolean {
  let found = false;
  visit(document, {
    Directive(node) {
      if (node.name.value === 'key' || node.name.value === 'extends') found = true;
    },
  });
  return found;
}

// Maps a spec key, e.g. "@key" or "FieldSet", to its name in the subgraph: its `import` alias if imported, and
// otherwise namespaced, e.g. "federation__key".
function getFederation2Names(link: DirectiveNode): (key: string) => string {
  const imports = new Map<string, string>();
  const importList = getArgument(link, 'import');
  for (const value of importList?.kind === Kind.LIST ? importList.values : []) {
    if (value.kind === Kind.STRING) {
      imports.set(value.value, value.value);
    } else if (value.kind === Kind.OBJECT) {
      const field = (name: string): string | undefined =>
        getString(value.fields.find(field => field.name.value === name)?.value);
      const name = field('name');
      if (name !== void 0) imports.set(name, field('as') ?? name);
    }
  }

  const namespace = getString(getArgument(link, 'as')) ?? 'federation';
  return key => {
    const name = key.replace(/^@/, '');
    if (UNNAMESPACED_NAMES.has(name)) return name;
    return (imports.get(key) ?? `${namespace}__${name}`).replace(/^@/, '');
  };
}

function getFederation2Definitions(link: DirectiveNode): DefinitionNode[] {
  federation2Definitions ??= parse(FEDERATION_2_SDL, { noLocation: true }).definitions;
  const getName = getFederation2Names(link);
  const rename = <T extends { name: { value: string } }>(node: T, key: string): T => ({
    ...node,
    name: { ...node.name, value: getName(key) },
  });

  return federation2Definitions.map(definition =>
    visit(definition, {
      DirectiveDefinition: node => rename(node, `@${node.name.value}`),
      ScalarTypeDefinition: node => rename(node, node.name.value),
      EnumTypeDefinition: node => rename(node, node.name.value),
      ObjectTypeDefinition: node => rename(node, node.name.value),
      NamedType: node => rename(node, node.name.value),
    }),
  );
}

export type FederatedDocument = {
  document: DocumentNode;
  // The nodes that stand in for nodes of the original document.
  substitutes: Map<ASTNode, ASTNode>;
};

/**
 * Makes an Apollo Federation subgraph valid as a standalone schema. A subgraph is federated when it links to
 * Federation 2 with `@link`, or uses `@key` or `@extends`, as Federation 1 subgraphs do. The federation directives
 * and types the subgraph uses without defining them are appended, and the first extension of a type the subgraph
 * does not define, e.g. `extend type Query`, stands in for its definition. Other documents are returned as is.
 */
export function addFederationDefinitions(document: DocumentNode): FederatedDocument {
  const substitutes = new Map<ASTNode, ASTNode>();
  const link = findFederation2Link(document);
  if (link === void 0 && !usesFederation1(document)) return { document, substitutes };

  const definitions = [...document.definitions];
  const defined = new Set<string>();
  for (const definition of definitions) {
    const key = getDefinitionKey(definition);
    if (key !== void 0) defined.add(key);
  }

  definitions.forEach((definition, i) => {
    if (!isTypeExtensionNode(definition) || defined.has(definition.name.value)) return;
    defined.add(definition.name.value);
    const substitute = { ...definition, kind: definition.kind.replace('Extension', 'Definition') } as DefinitionNode;
    substitutes.set(substitute, definition);
    definitions[i] = substitute;
  });

  federation1Definitions ??= parse(FEDERATION_1_SDL, { noLocation: true }).definitions;
  const available = new Map<string, DefinitionNode>();
  for (const definition of link === void 0 ? federation1Definitions : getFederation2Definitions(link)) {
    available.set(getDefinitionKey(definition) ?? '', definition);
  }

  // Adds the definitions a node refers to, and the ones those refer to in turn.
  const addReferences = (node: ASTNode): void => {
    const use = (key: string): void => {
      const definition = available.get(key);
      if (definition === void 0 || defined.has(key)) return;
      defined.add(key);
      definitions.push(definition);
      addReferences(definition);
    };
    visit(node, {
      Directive: node => use(`@${node.name.value}`),
      NamedType: node => use(node.name.value),
    });
  };
  addReferences(document);

  return { document: { ...document, definitions }, substitutes };
}

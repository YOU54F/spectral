import {
  buildASTSchema,
  GraphQLError,
  KnownArgumentNamesRule,
  KnownDirectivesRule,
  KnownTypeNamesRule,
  LoneSchemaDefinitionRule,
  PossibleTypeExtensionsRule,
  ProvidedRequiredArgumentsRule,
  UniqueArgumentDefinitionNamesRule,
  UniqueArgumentNamesRule,
  UniqueDirectiveNamesRule,
  UniqueDirectivesPerLocationRule,
  UniqueEnumValueNamesRule,
  UniqueFieldDefinitionNamesRule,
  UniqueInputFieldNamesRule,
  UniqueOperationTypesRule,
  UniqueTypeNamesRule,
  validateSchema,
  visit,
  visitInParallel,
} from 'graphql';
import type { ASTNode, ASTVisitor, DocumentNode } from 'graphql';
import type { Segment } from '@stoplight/types';
import { getGraphqlAst } from '@stoplight/spectral-parsers/graphql';
import { addFederationDefinitions } from './federation';

// graphql-js `specifiedSDLRules`, split into the uniqueness rules, which the spectral:graphql ruleset covers
// with rules of its own, and the rest.
const UNIQUENESS_RULES = [
  UniqueTypeNamesRule,
  UniqueEnumValueNamesRule,
  UniqueFieldDefinitionNamesRule,
  UniqueDirectiveNamesRule,
];

// KnownArgumentNamesRule and ProvidedRequiredArgumentsRule stand in for their `OnDirectives` SDL variants, which
// graphql-js does not export. Their extra checks only apply to fields of executable documents.
const SDL_RULES = [
  LoneSchemaDefinitionRule,
  UniqueOperationTypesRule,
  UniqueArgumentDefinitionNamesRule,
  KnownTypeNamesRule,
  KnownDirectivesRule,
  UniqueDirectivesPerLocationRule,
  PossibleTypeExtensionsRule,
  KnownArgumentNamesRule,
  UniqueArgumentNamesRule,
  UniqueInputFieldNamesRule,
  ProvidedRequiredArgumentsRule,
];

type SDLContext = {
  getDocument(): DocumentNode;
  getSchema(): undefined;
  reportError(error: GraphQLError): void;
  getArgument(): undefined;
  getFieldDef(): undefined;
  getParentType(): undefined;
};
type SDLRule = (context: never) => ASTVisitor;

// Equivalent to graphql-js `validateSDL` without a schema to extend, which graphql-js does not export.
// SDL rules only use getDocument, getSchema and reportError; the rest are for the executable rules above.
function validateSDL(document: DocumentNode, rules: SDLRule[]): GraphQLError[] {
  const errors: GraphQLError[] = [];
  const context: SDLContext = {
    getDocument: () => document,
    getSchema: () => void 0,
    reportError: error => void errors.push(error),
    getArgument: () => void 0,
    getFieldDef: () => void 0,
    getParentType: () => void 0,
  };
  visit(document, visitInParallel(rules.map(rule => (rule as (context: SDLContext) => ASTVisitor)(context))));
  return errors;
}

// A file may hold part of a larger schema, so a missing Query type is not reported.
const IGNORED_SCHEMA_ERRORS = new Set(['Query root type must be provided.']);

export type GraphqlSchemaError = { message: string; path: Segment[] };

export type ValidateGraphqlSchemaOptions = {
  // Accept Apollo Federation subgraphs; see addFederationDefinitions. Defaults to true.
  federation?: boolean;
};

/**
 * Validates a document produced by the Graphql parser as a standalone schema, the way graphql-js
 * `buildASTSchema` and `validateSchema` do: unknown types and directives, invalid extensions,
 * interface conformance and so on. Duplicate type, field, enum value and directive names are left to the
 * uniqueness rules. Apollo Federation subgraphs may use federation directives and types without defining them.
 * Returns `undefined` when the document was not produced by the Graphql parser.
 */
export function validateGraphqlSchema(
  data: unknown,
  { federation = true }: ValidateGraphqlSchemaOptions = {},
): GraphqlSchemaError[] | undefined {
  const graphqlAst = getGraphqlAst(data);
  if (graphqlAst === void 0) return void 0;

  const { paths } = graphqlAst;
  const { document, substitutes } = federation
    ? addFederationDefinitions(graphqlAst.document)
    : { document: graphqlAst.document, substitutes: new Map<ASTNode, ASTNode>() };
  // Errors in appended federation definitions, if any, have no path in the document.
  const toResult = (error: GraphQLError): GraphqlSchemaError => {
    const node: ASTNode | undefined = error.nodes
      ?.map(node => substitutes.get(node) ?? node)
      .find(node => paths.has(node));
    return { message: error.message, path: node === void 0 ? [] : (paths.get(node) ?? []) };
  };

  const errors = validateSDL(document, SDL_RULES);
  if (errors.length > 0) return errors.map(toResult);

  // buildASTSchema needs valid SDL, including unique names.
  if (validateSDL(document, UNIQUENESS_RULES).length > 0) return [];

  return validateSchema(buildASTSchema(document, { assumeValidSDL: true }))
    .filter(error => !IGNORED_SCHEMA_ERRORS.has(error.message))
    .map(toResult);
}

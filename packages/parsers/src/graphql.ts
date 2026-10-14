import { GraphQLError, parse as parseGraphql } from 'graphql';
import type { DocumentNode } from 'graphql';
import { DiagnosticSeverity } from '@stoplight/types';
import type { IDiagnostic, IParserResult, IPosition, IRange, JsonPath, Segment } from '@stoplight/types';
import { IParser } from './types';

// Start and end offsets of a node in the source, keyed by the JSON path of its plain-object representation.
export type GraphqlLocations = Map<string, readonly [start: number, end: number]>;

// The plain-object representation of a GraphQL document, e.g. `{ kind: 'Document', definitions: [...] }`.
export type GraphqlDocument = { kind: 'Document'; definitions: Record<string, unknown>[] };

export type GraphqlParserResult = IParserResult<GraphqlDocument | undefined, GraphqlLocations, number[], unknown>;

type GraphqlNode = { kind: string; loc?: { start: number; end: number } } & Record<string, unknown>;

const isNode = (value: unknown): value is GraphqlNode =>
  typeof value === 'object' && value !== null && typeof (value as GraphqlNode).kind === 'string';

// The graphql-js DocumentNode and the JSON path of each of its nodes, kept on the plain document as a
// non-enumerable property so that rules can validate the schema without re-parsing the source.
const GRAPHQL_AST = Symbol.for('@stoplight/spectral-parsers/graphql');

export type GraphqlAst = { document: DocumentNode; paths: WeakMap<object, Segment[]> };

const pathKey = (path: readonly Segment[]): string => JSON.stringify(path.map(String));

// Converts graphql-js AST nodes into plain objects without `loc`.
// Name nodes and `description` string values become plain strings, so `$.definitions[*].name` is the type name.
function toPlain(
  value: unknown,
  path: Segment[],
  locations: GraphqlLocations,
  paths: WeakMap<object, Segment[]>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item, i) => toPlain(item, [...path, i], locations, paths));
  }

  if (!isNode(value)) {
    return value;
  }

  paths.set(value, path);

  if (value.loc !== void 0) {
    locations.set(pathKey(path), [value.loc.start, value.loc.end]);
  }

  if (value.kind === 'Name' || (path[path.length - 1] === 'description' && value.kind === 'StringValue')) {
    return value.value;
  }

  const plain: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'loc' || child === void 0) continue;
    plain[key] = toPlain(child, [...path, key], locations, paths);
  }

  return plain;
}

function computeLineMap(input: string): number[] {
  const lineMap = [0];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '\n') {
      lineMap.push(i + 1);
    }
  }

  return lineMap;
}

function getPosition(lineMap: number[], offset: number): IPosition {
  let low = 0;
  let high = lineMap.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineMap[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return { line: low, character: offset - lineMap[low] };
}

export const parseGraphqlDocument = (input: string): GraphqlParserResult => {
  const lineMap = computeLineMap(input);
  const ast: GraphqlLocations = new Map();
  const diagnostics: IDiagnostic[] = [];

  let data: GraphqlDocument | undefined;
  try {
    const document = parseGraphql(input);
    const paths = new WeakMap<object, Segment[]>();
    data = toPlain(document, [], ast, paths) as GraphqlDocument;
    const graphqlAst: GraphqlAst = { document, paths };
    Object.defineProperty(data, GRAPHQL_AST, { value: graphqlAst });
  } catch (e) {
    const position =
      e instanceof GraphQLError && e.positions !== void 0 && e.positions.length > 0
        ? getPosition(lineMap, e.positions[0])
        : { line: 0, character: 0 };
    diagnostics.push({
      code: 'parse-error',
      message: e instanceof GraphQLError ? e.message.replace(/^Syntax Error: /, '') : String(e),
      severity: DiagnosticSeverity.Error,
      range: { start: position, end: position },
    });
  }

  return { data, ast, lineMap, diagnostics };
};

export const getLocationForGraphqlPath = (
  { ast, lineMap }: GraphqlParserResult,
  path: JsonPath,
  closest = false,
): { range: IRange } | undefined => {
  for (let i = path.length; i >= 0; i--) {
    const location = ast.get(pathKey(path.slice(0, i)));
    if (location !== void 0) {
      return { range: { start: getPosition(lineMap, location[0]), end: getPosition(lineMap, location[1]) } };
    }

    if (!closest) break;
  }

  return void 0;
};

export const Graphql: IParser<GraphqlParserResult> = {
  parse: parseGraphqlDocument,
  getLocationForJsonPath: getLocationForGraphqlPath,
  trapAccess: obj => obj,
};

/**
 * Returns the graphql-js DocumentNode behind a document produced by the Graphql parser, with the JSON path of each
 * of its nodes, or `undefined` when the document was not produced by the Graphql parser.
 */
export const getGraphqlAst = (data: unknown): GraphqlAst | undefined =>
  typeof data === 'object' && data !== null ? (data as { [GRAPHQL_AST]?: GraphqlAst })[GRAPHQL_AST] : void 0;

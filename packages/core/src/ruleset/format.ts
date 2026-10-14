import type { AnyParser } from '@stoplight/spectral-parsers';

export type FormatContext = {
  // The parser that produced the document, or null when it is not known, e.g. for pre-parsed documents.
  parser: AnyParser | null;
};

export type Format<D = void> = (D extends void
  ? (document: unknown, source: string | null, context?: FormatContext) => boolean
  : (document: unknown, source: string | null, context?: FormatContext) => document is D) & {
  displayName?: string;
  /**
   * JSONPath expressions selecting subtrees whose $refs must not be resolved, for instance because they are relative to
   * a different document (e.g. the fragments an OpenAPI Overlay merges into its target document).
   * $refs found within these subtrees are neither followed nor reported as invalid.
   * Since resolution happens before formats are matched against the resolved document,
   * formats declaring this property are additionally matched against the unresolved document.
   */
  unresolvedPaths?: ReadonlyArray<string>;
};

export type Format<D = void> = (D extends void
  ? (document: unknown, source: string | null) => boolean
  : (document: unknown, source: string | null) => document is D) & {
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

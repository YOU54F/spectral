import type { AnyParser } from '@stoplight/spectral-parsers';

export type FormatContext = {
  // The parser that produced the document, or null when it is not known, e.g. for pre-parsed documents.
  parser: AnyParser | null;
};

export type Format<D = void> = (D extends void
  ? (document: unknown, source: string | null, context?: FormatContext) => boolean
  : (document: unknown, source: string | null, context?: FormatContext) => document is D) & {
  displayName?: string;
};

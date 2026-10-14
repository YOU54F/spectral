import { IParserResult } from '@stoplight/types';
import { IParser } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyParser = IParser<IParserResult<any, any, any, any>>;

export type ParserEntry = {
  parser: AnyParser;
  // File extensions handled by the parser, e.g. ['.graphql', '.gql']. Compound extensions such as '.schema.json' work too.
  extensions?: string[];
  // Content sniffing, used when no extension matches, e.g. for stdin or for files with a generic extension.
  test?: (input: string, source: string | null) => boolean;
};

function normalizeExtension(extension: string): string {
  return (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase();
}

function stripQueryAndFragment(source: string): string {
  return source.replace(/[?#].*$/, '');
}

export class ParserRegistry implements Iterable<ParserEntry> {
  readonly #entries: ParserEntry[] = [];

  constructor(entries: Iterable<ParserEntry> = []) {
    for (const entry of entries) {
      this.register(entry);
    }
  }

  public get size(): number {
    return this.#entries.length;
  }

  // Entries registered later take precedence over earlier ones.
  public register(entry: ParserEntry): this {
    if ((entry.extensions === void 0 || entry.extensions.length === 0) && entry.test === void 0) {
      throw new TypeError('A parser entry needs at least one extension or a test function');
    }

    this.#entries.push({
      ...entry,
      ...(entry.extensions !== void 0 && { extensions: entry.extensions.map(normalizeExtension) }),
    });

    return this;
  }

  // Returns the parser for the given document, or null when no entry matches. Extensions are checked before tests.
  public find(source: string | null, input: string): AnyParser | null {
    if (source !== null) {
      const path = stripQueryAndFragment(source).toLowerCase();
      for (let i = this.#entries.length - 1; i >= 0; i--) {
        const { extensions, parser } = this.#entries[i];
        if (extensions?.some(extension => path.endsWith(extension)) === true) {
          return parser;
        }
      }
    }

    for (let i = this.#entries.length - 1; i >= 0; i--) {
      const { test, parser } = this.#entries[i];
      if (test?.(input, source) === true) {
        return parser;
      }
    }

    return null;
  }

  public [Symbol.iterator](): Iterator<ParserEntry> {
    return this.#entries[Symbol.iterator]();
  }
}

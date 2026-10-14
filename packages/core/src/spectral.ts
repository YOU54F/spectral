import { stringify } from '@stoplight/json';
import { DiagnosticSeverity } from '@stoplight/types';
import * as Parsers from '@stoplight/spectral-parsers';
import { createHttpAndFileResolver, Resolver } from '@stoplight/spectral-ref-resolver';

import { Document, IDocument, IParsedResult, isParsedResult, ParsedDocument } from './document';
import { DocumentInventory } from './documentInventory';
import { Runner } from './runner';
import type { IConstructorOpts, IRunOpts, ISpectralDiagnostic, ISpectralFullResult } from './types';
import type { Format, FormatContext, ParserOptions, RulesetDefinition } from './ruleset/index';
import { Ruleset } from './ruleset/ruleset';
import { generateDocumentWideResult } from './utils/generateDocumentWideResult';
import { getDiagnosticSeverity } from './ruleset';

export * from './types';

export class Spectral {
  private readonly _resolver: Resolver;
  private readonly _parsers: Parsers.ParserRegistry;

  public ruleset?: Ruleset;

  constructor(protected readonly opts?: IConstructorOpts) {
    if (opts?.resolver !== void 0) {
      this._resolver = opts.resolver;
    } else {
      this._resolver = createHttpAndFileResolver();
    }

    this._parsers = new Parsers.ParserRegistry(opts?.parsers);
  }

  // Parsers from the ruleset, then from the constructor options, which win when both match.
  protected getParsers(): Parsers.ParserRegistry {
    if (this.ruleset === void 0 || this.ruleset.parsers.size === 0) {
      return this._parsers;
    }

    return new Parsers.ParserRegistry([...this.ruleset.parsers, ...this._parsers]);
  }

  /**
   * Creates a document using the first registered parser that matches the source or content.
   * Falls back to YAML, which also parses JSON.
   */
  public createDocument(input: string, source?: string): IDocument {
    return new Document(input, this.getParsers().find(source ?? null, input) ?? Parsers.Yaml, source);
  }

  protected parseDocument(target: IParsedResult | IDocument | Record<string, unknown> | string): IDocument {
    return target instanceof Document
      ? target
      : isParsedResult(target)
        ? new ParsedDocument(target)
        : typeof target === 'string'
          ? this.createDocument(target)
          : new Document<unknown, Parsers.YamlParserResult<unknown>>(stringify(target, void 0, 2), Parsers.Yaml);
  }

  public async runWithResolved(
    target: IParsedResult | IDocument | Record<string, unknown> | string,
    opts: IRunOpts = {},
  ): Promise<ISpectralFullResult> {
    if (this.ruleset === void 0) {
      throw new Error('No ruleset has been defined. Have you called setRuleset()?');
    }

    const document = this.parseDocument(target);

    const candidateFormats = this.ruleset.formats;
    const context: FormatContext = { parser: document instanceof Document ? document.parser : null };

    const inventory = new DocumentInventory(document, this._resolver, this.getParsers());
    await inventory.resolve({ unresolvedPaths: this._getUnresolvedPaths(document, candidateFormats, context) });

    let unrecognizedFormat = false;

    if (document.formats === void 0) {
      const foundFormats = [...candidateFormats].filter(format => format(inventory.resolved, document.source, context));
      if (foundFormats.length === 0 && opts.ignoreUnknownFormat !== true) {
        document.formats = null;
        unrecognizedFormat = candidateFormats.size > 0;
      } else {
        document.formats = new Set(foundFormats);
      }
    }

    const ruleset = this.ruleset.fromSource(document.source, document.formats ?? null);

    const runner = new Runner(inventory);
    const parserErrors = this._filterParserErrors(document.diagnostics, ruleset.parserOptions);
    runner.results.push(...parserErrors);

    // A document that failed to parse is already reported, so its format is not reported as well.
    const failedToParse = parserErrors.some(({ severity }) => severity === DiagnosticSeverity.Error);
    if (unrecognizedFormat && !failedToParse) {
      runner.addResult(this._generateUnrecognizedFormatError(document, Array.from(candidateFormats)));
    }

    await runner.run(ruleset);
    const results = runner.getResults();

    return {
      resolved: inventory.resolved,
      results,
    };
  }

  public async run(
    target: IParsedResult | IDocument | Record<string, unknown> | string,
    opts: IRunOpts = {},
  ): Promise<ISpectralDiagnostic[]> {
    return (await this.runWithResolved(target, opts)).results;
  }

  public setRuleset(ruleset: RulesetDefinition | Ruleset): void {
    this.ruleset = ruleset instanceof Ruleset ? ruleset : new Ruleset(ruleset);
  }

  // Only formats opting in via unresolvedPaths are considered, so documents of other formats are resolved as before.
  private _getUnresolvedPaths(document: IDocument, formats: Iterable<Format>, context: FormatContext): string[] {
    const unresolvedPaths: string[] = [];
    if (document.formats === null) return unresolvedPaths;

    // formats explicitly assigned to the document take precedence, mirroring regular format matching
    const isPreassigned = document.formats !== void 0;
    for (const format of document.formats ?? formats) {
      if (format.unresolvedPaths === void 0 || format.unresolvedPaths.length === 0) continue;
      if (!isPreassigned && !format(document.data, document.source, context)) continue;
      unresolvedPaths.push(...format.unresolvedPaths);
    }

    return unresolvedPaths;
  }

  private _generateUnrecognizedFormatError(document: IDocument, formats: Format[]): ISpectralDiagnostic {
    return generateDocumentWideResult(
      document,
      `The provided document does not match any of the registered formats [${formats
        .map(fn => fn.displayName ?? fn.name)
        .join(', ')}]`,
      DiagnosticSeverity.Warning,
      'unrecognized-format',
    );
  }

  private _filterParserErrors(
    diagnostics: ReadonlyArray<ISpectralDiagnostic>,
    parserOptions: ParserOptions,
  ): ISpectralDiagnostic[] {
    return diagnostics.reduce<ISpectralDiagnostic[]>((diagnostics, diagnostic) => {
      if (diagnostic.code !== 'parser') return diagnostics;

      let severity;

      if (diagnostic.message.startsWith('Mapping key must be a string scalar rather than')) {
        severity = getDiagnosticSeverity(parserOptions.incompatibleValues);
      } else if (diagnostic.message.startsWith('Duplicate key')) {
        severity = getDiagnosticSeverity(parserOptions.duplicateKeys);
      } else {
        diagnostics.push(diagnostic);
        return diagnostics;
      }

      if (severity !== -1) {
        diagnostics.push(diagnostic);
        diagnostic.severity = severity;
      }

      return diagnostics;
    }, []);
  }
}

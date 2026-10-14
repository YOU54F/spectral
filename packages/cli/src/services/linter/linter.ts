/* eslint-disable no-console */
import { IDocument, IRuleResult, Ruleset, Spectral } from '@stoplight/spectral-core';
import { readParsable, IFileReadOptions } from '@stoplight/spectral-runtime';
import { getRuleset, listFiles, segregateEntriesPerKind, readFileDescriptor } from './utils';
import { getResolver } from './utils/getResolver';
import { ILintConfig } from '../config';
import { CLIError } from '../../errors';

export interface LinterResult {
  results: IRuleResult[];
  resolvedRuleset: Ruleset;
}

export async function lint(documents: Array<number | string>, flags: ILintConfig): Promise<LinterResult> {
  const spectral = new Spectral({
    resolver: getResolver(flags.resolver),
  });

  const ruleset = await getRuleset(flags.ruleset);

  spectral.setRuleset(ruleset);
  if (flags.verbose === true) {
    const rules = Object.values(ruleset.rules);
    console.info(`Found ${rules.length} rules (${rules.filter(rule => rule.enabled).length} enabled)`);
  }

  const [globs, fileDescriptors] = segregateEntriesPerKind(documents);
  const [targetUris, unmatchedPatterns] = await listFiles(globs, !flags.failOnUnmatchedGlobs);
  const results: IRuleResult[] = [];

  if (unmatchedPatterns.length > 0) {
    if (flags.failOnUnmatchedGlobs) {
      throw new CLIError(`Unmatched glob patterns: \`${unmatchedPatterns.join(',')}\``);
    }

    for (const unmatchedPattern of unmatchedPatterns) {
      console.log(`Glob pattern \`${unmatchedPattern}\` did not match any files`);
    }
  }

  const targets = [...targetUris, ...fileDescriptors];
  if (targets.length === 0) {
    throw new CLIError(`No files found to lint. Please check your file path and extension and try again`);
  }

  for (const targetUri of targets) {
    if (flags.verbose === true) {
      console.info(`Linting ${targetUri}`);
    }

    const document = await createDocument(
      spectral,
      targetUri,
      { encoding: flags.encoding },
      flags.stdinFilepath ?? '<STDIN>',
    );

    results.push(
      ...(await spectral.run(document, {
        ignoreUnknownFormat: flags.ignoreUnknownFormat,
      })),
    );
  }

  return {
    results: results,
    resolvedRuleset: ruleset,
  };
}

const createDocument = async (
  spectral: Spectral,
  identifier: string | number,
  opts: IFileReadOptions,
  source: string,
): Promise<IDocument> => {
  if (typeof identifier === 'string') {
    return spectral.createDocument(await readParsable(identifier, opts), identifier);
  }

  return spectral.createDocument(await readFileDescriptor(identifier, opts), source);
};

import { isAbsolute, isURL, join } from '@stoplight/path';
import type { ParserEntry } from '@stoplight/spectral-parsers';
import { isError, isPlainObject } from 'lodash';
import { CLIError } from '../../../errors';

// Loads parser entries from local modules passed via --parser. Like --resolver, the modules are trusted code, so
// only local paths are accepted.
export const getParsers = (modules: string[] = []): ParserEntry[] => modules.flatMap(loadParserModule);

function loadParserModule(id: string): ParserEntry[] {
  if (isURL(id)) {
    throw new CLIError(`Parser "${id}" must be a local module, URLs are not supported.`);
  }

  let exported: unknown;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    exported = require(resolveModule(id));
  } catch (ex) {
    throw new CLIError(isError(ex) ? formatMessage(ex.message) : String(ex));
  }

  if (isPlainObject(exported) && 'default' in (exported as object) && !('parser' in (exported as object))) {
    exported = (exported as { default: unknown }).default;
  }

  const entries = Array.isArray(exported) ? exported : [exported];
  if (entries.length === 0 || !entries.every(isParserEntry)) {
    throw new CLIError(
      `Parser "${id}" must export a parser entry ({ parser, extensions?, test? }) or an array of them, with at least one of extensions or test.`,
    );
  }

  return entries;
}

// Paths are resolved against the working directory, bare specifiers (package names) against its node_modules.
function resolveModule(id: string): string {
  if (isAbsolute(id)) return id;
  if (id.startsWith('.')) return join(process.cwd(), id);
  return require.resolve(id, { paths: [process.cwd()] });
}

function isParserEntry(entry: unknown): entry is ParserEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  const { parser, extensions, test } = entry as Record<string, unknown>;

  const isParser =
    typeof parser === 'object' &&
    parser !== null &&
    ['parse', 'getLocationForJsonPath', 'trapAccess'].every(
      key => typeof (parser as Record<string, unknown>)[key] === 'function',
    );
  const hasExtensions =
    Array.isArray(extensions) && extensions.length > 0 && extensions.every(ext => typeof ext === 'string');

  return (
    isParser &&
    (extensions === void 0 || hasExtensions) &&
    (test === void 0 || typeof test === 'function') &&
    (hasExtensions || test !== void 0)
  );
}

function formatMessage(message: string): string {
  return message.split(/\r?\n/)[0].replace(/\\/g, '/');
}

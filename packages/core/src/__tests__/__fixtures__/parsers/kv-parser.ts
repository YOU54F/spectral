import type { IParserResult, IRange } from '@stoplight/types';
import type { AnyParser } from '@stoplight/spectral-parsers';

type KeyValueResult = IParserResult<Record<string, string>, Record<string, IRange>, number[]>;

// Parses `key=value` lines, enough to check that custom parsers are picked up and that ranges come from them.
export const KeyValue: AnyParser = {
  parse(input: string): KeyValueResult {
    const data: Record<string, string> = {};
    const ast: Record<string, IRange> = {};
    const lineMap: number[] = [];

    input.split('\n').forEach((line, i) => {
      lineMap.push(i);
      const index = line.indexOf('=');
      if (index === -1) return;
      const key = line.slice(0, index).trim();
      data[key] = line.slice(index + 1).trim();
      ast[key] = { start: { line: i, character: 0 }, end: { line: i, character: line.length } };
    });

    return { data, ast, lineMap, diagnostics: [] };
  },

  getLocationForJsonPath(result: KeyValueResult, path) {
    const range = path.length > 0 ? result.ast[String(path[0])] : void 0;
    return range === void 0 ? void 0 : { range };
  },

  trapAccess: obj => obj,
};

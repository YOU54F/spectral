import { getLocationForJsonPathInXml, parseXml } from '@stoplight/spectral-parsers';
import type { IParser, XmlParserResult } from '@stoplight/spectral-parsers';
import type { IParserResult, JsonPath } from '@stoplight/types';
import { attrPath, importLocations, WsdlDocument } from './functions/utils';

export type WsdlParserResult = IParserResult<WsdlDocument, XmlParserResult['ast'], number[]>;

// the key of a JSON path in XmlParserResult['ast']
const pathKey = (path: JsonPath): string => path.map(String).join('\u0000');

// Parses XML like the Xml parser, and adds an "imports" array with a { $ref } for each wsdl:import, and for each
// xsd:import, xsd:include, xsd:redefine and xsd:override, so that Spectral's resolver loads the imported files.
// The ranges of the $refs are those of the location attributes, so that resolver errors point at them.
export const parseWsdl = (input: string): WsdlParserResult => {
  const result: WsdlParserResult = parseXml(input);
  const { root } = result.data;
  if (root === null) return result;

  const imports = importLocations({ element: root, path: ['root'] }).filter(({ ref }) => ref !== null);
  if (imports.length === 0) return result;

  result.data.imports = imports.map(({ located, attribute, ref }, i) => {
    const range = result.ast.get(pathKey(attrPath(located, attribute)));
    if (range !== void 0) {
      result.ast.set(pathKey(['imports', i]), range);
      result.ast.set(pathKey(['imports', i, '$ref']), range);
    }

    return { $ref: ref };
  });

  return result;
};

export const Wsdl: IParser<WsdlParserResult> = {
  parse: parseWsdl,
  getLocationForJsonPath: getLocationForJsonPathInXml,
  trapAccess: obj => obj,
};

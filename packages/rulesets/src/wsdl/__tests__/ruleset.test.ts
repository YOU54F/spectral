import { Document } from '@stoplight/spectral-core';
import * as Parsers from '@stoplight/spectral-parsers';
import wsdlRuleset from '../index';
import { createWithRules, wsdlDoc } from './__helpers__/tester';
import { valid } from './__helpers__/valid';

const ruleNames = Object.keys(wsdlRuleset.rules) as Array<keyof typeof wsdlRuleset.rules>;

describe('spectral:wsdl ruleset', () => {
  it('reports nothing for a valid file', async () => {
    const s = createWithRules(ruleNames);
    expect(await s.run(wsdlDoc(valid))).toEqual([]);
  });

  it('does not apply to non-WSDL documents', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(
      new Document(
        JSON.stringify({ openapi: '3.1.0', root: { localName: 'definitions', children: [] } }),
        Parsers.Json,
      ),
    );
    expect(results.filter(r => r.code.toString().startsWith('wsdl-'))).toEqual([]);

    const xsd = await s.run(
      wsdlDoc('<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"><xsd:element name="a"/></xsd:schema>'),
    );
    expect(xsd.filter(r => r.code.toString().startsWith('wsdl-'))).toEqual([]);
  });

  it('registers the XML parser for .wsdl files, and sniffs WSDL in other files', () => {
    expect(wsdlRuleset.parsers).toEqual([
      { parser: Parsers.Xml, extensions: ['.wsdl'], test: expect.any(Function) as unknown },
    ]);
    const [{ test }] = wsdlRuleset.parsers;
    expect(test(valid)).toBe(true);
    expect(test('\uFEFF  <definitions xmlns="http://schemas.xmlsoap.org/wsdl/"/>')).toBe(true);
    expect(test('<description xmlns="http://www.w3.org/ns/wsdl"/>')).toBe(false);
    expect(test('<project><definitions xmlns="urn:other"/></project>')).toBe(false);
    expect(test('{"xml": "<definitions xmlns=\\"http://schemas.xmlsoap.org/wsdl/\\">"}')).toBe(false);
    expect(test('openapi: 3.1.0\n')).toBe(false);
  });

  it('surfaces syntax errors', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(
      wsdlDoc(
        '<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/">\n  <wsdl:message name="A">\n</wsdl:definitions>\n',
      ),
    );
    expect(results).toEqual([
      expect.objectContaining({
        code: 'parser',
        message: 'Element <wsdl:message> is not closed',
        range: { start: { line: 1, character: 2 }, end: { line: 1, character: 15 } },
      }),
    ]);
  });

  it('every rule is documented', () => {
    for (const rule of Object.values(wsdlRuleset.rules)) {
      expect(rule.description).toEqual(expect.any(String));
    }
  });
});

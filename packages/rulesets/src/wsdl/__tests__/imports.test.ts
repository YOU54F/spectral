import * as path from '@stoplight/path';
import { Document } from '@stoplight/spectral-core';
import { serveAssets } from '@stoplight/spectral-test-utils';
import { DiagnosticSeverity } from '@stoplight/types';
import wsdlRuleset from '../index';
import { Wsdl } from '../parser';
import { definitions, WsdlDocument } from '../functions/utils';
import { createWithRules } from './__helpers__/tester';

const ruleNames = Object.keys(wsdlRuleset.rules) as Array<keyof typeof wsdlRuleset.rules>;
const fs = jest.requireActual<typeof import('fs')>('fs');
const FIXTURES = path.join(__dirname, '__fixtures__/imports');
const fixture = (name: string): string => path.join(FIXTURES, name);

// fs is mocked with memfs, which is what Spectral's resolver reads, so the fixtures are copied there.
function load(name: string): Document {
  serveAssets(
    Object.fromEntries(fs.readdirSync(FIXTURES).map(file => [fixture(file), fs.readFileSync(fixture(file), 'utf8')])),
  );
  return new Document(fs.readFileSync(fixture(name), 'utf8'), Wsdl, fixture(name)) as Document;
}
const range = (line: number, start: number, end: number) => ({
  start: { line, character: start },
  end: { line, character: end },
});

describe('spectral:wsdl imports', () => {
  it('adds a $ref for each import with a followable location', () => {
    const { data } =
      Wsdl.parse(`<wsdl:definitions xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<wsdl:import namespace="urn:a" location="a.wsdl#x"/>
<wsdl:import namespace="urn:b" location="urn:b"/>
<wsdl:import namespace="urn:c"/>
<wsdl:types><xsd:schema><xsd:import namespace="urn:d" schemaLocation="https://example.com/d?xsd=1"/><xsd:include schemaLocation="e.xsd"/></xsd:schema></wsdl:types>
</wsdl:definitions>`);
    expect(data.imports).toEqual([{ $ref: 'a.wsdl' }, { $ref: 'https://example.com/d?xsd=1' }, { $ref: 'e.xsd' }]);
    expect(Wsdl.parse('<a/>').data).not.toHaveProperty('imports');
  });

  it('follows wsdl:import, xsd:import and xsd:include', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(load('main.wsdl'));

    expect(results).toEqual([
      expect.objectContaining({
        code: 'wsdl-message-part-reference',
        message: 'Element "pets:Owner" is not defined in the schema for "urn:example:pets".',
        path: ['root', 'children', '1', 'children', '1', 'attributes', 'element', 'value'],
        range: range(9, 37, 47),
        source: fixture('main.wsdl'),
      }),
      expect.objectContaining({
        code: 'wsdl-binding-operation-reference',
        message: 'Operation "DeletePet" is not defined in port type "PetPortType".',
        path: ['root', 'children', '2', 'children', '2', 'attributes', 'name', 'value'],
        range: range(18, 26, 35),
        source: fixture('main.wsdl'),
      }),
    ]);
  });

  it('handles import cycles', async () => {
    const s = createWithRules(['wsdl-operation-message-reference']);
    const results = await s.run(load('cycle-a.wsdl'));

    expect(results).toEqual([
      expect.objectContaining({
        code: 'wsdl-operation-message-reference',
        message: 'Message "b:Out" is not defined.',
        path: ['root', 'children', '1', 'children', '0', 'children', '1', 'attributes', 'message', 'value'],
      }),
    ]);
  });

  it('handles an import cycle that comes back as a copy of the root document', () => {
    // A resolver may hand back a copy of the root, with its own imports left unloaded, rather than the root itself.
    const parse = (name: string): WsdlDocument => Wsdl.parse(fs.readFileSync(fixture(name), 'utf8')).data;
    const a = parse('cycle-a.wsdl');
    const b = parse('cycle-b.wsdl');
    a.imports = [b];
    b.imports = [parse('cycle-a.wsdl')];

    const defs = definitions(a, []);
    expect([...defs.wsdlNamespaces]).toEqual(['urn:example:a', 'urn:example:b']);
    expect([...defs.unchecked]).toEqual([]);
  });

  it('reports imports that cannot be loaded, and does not check references into their namespace', async () => {
    const s = createWithRules(['wsdl-operation-message-reference']);
    const results = await s.run(load('unresolved.wsdl'));

    expect(results).toEqual([
      expect.objectContaining({
        code: 'invalid-ref',
        path: ['imports', '0', '$ref'],
        severity: DiagnosticSeverity.Error,
        range: range(2, 51, 70),
        source: fixture('unresolved.wsdl'),
      }),
    ]);
  });

  it('does not run WSDL rules on an XML Schema on its own', async () => {
    const s = createWithRules(ruleNames);
    const results = await s.run(load('pets.xsd'));
    expect(results.map(({ code }) => code)).toEqual(['unrecognized-format']);
  });

  it('follows imports over http', async () => {
    serveAssets({
      'https://example.com/petstore?xsd=1': `<xsd:schema targetNamespace="urn:example:pets" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
<xsd:element name="Pet"/>
</xsd:schema>`,
    });
    const s = createWithRules(['wsdl-message-part-reference']);
    const results = await s.run(
      new Document(
        `<wsdl:definitions targetNamespace="urn:example:petstore" xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:pets="urn:example:pets">
<wsdl:types><xsd:schema><xsd:import namespace="urn:example:pets" schemaLocation="https://example.com/petstore?xsd=1"/></xsd:schema></wsdl:types>
<wsdl:message name="A"><wsdl:part name="a" element="pets:Pet"/><wsdl:part name="b" element="pets:Owner"/></wsdl:message>
</wsdl:definitions>`,
        Wsdl,
        'https://example.com/petstore?wsdl',
      ),
    );

    expect(results).toEqual([
      expect.objectContaining({
        code: 'wsdl-message-part-reference',
        message: 'Element "pets:Owner" is not defined in the schema for "urn:example:pets".',
      }),
    ]);
  });
});

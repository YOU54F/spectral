import { DiagnosticSeverity } from '@stoplight/types';
import { getLocationForJsonPathInXml, parseXml, Xml, XmlElement } from '../xml';

const range = (startLine: number, startChar: number, endLine: number, endChar: number) => ({
  start: { line: startLine, character: startChar },
  end: { line: endLine, character: endChar },
});

const errors = (input: string) => parseXml(input).diagnostics.map(({ message, range }) => ({ message, range }));

const source = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!-- a comment -->
<p:root xmlns:p="urn:p" xmlns="urn:default" p:id="1" plain='a &amp; b'>
  <child>Hello &lt;world&gt; &#x41;&#66;<![CDATA[ <raw> ]]></child>
  <p:empty/>
  <other xmlns="">
    <?pi data?>
    <leaf attr="x
y"/>
  </other>
</p:root>
`;

describe('XML parser', () => {
  const result = parseXml(source);
  const root = result.data.root as XmlElement;

  it('parses the declaration', () => {
    expect(result.diagnostics).toEqual([]);
    expect(result.data).toMatchObject({ kind: 'xml', version: '1.0', encoding: 'UTF-8', standalone: true });
  });

  it('resolves names and namespaces', () => {
    expect(root).toMatchObject({
      name: 'p:root',
      prefix: 'p',
      localName: 'root',
      namespace: 'urn:p',
      namespaces: { p: 'urn:p', '': 'urn:default' },
      attributes: {
        'p:id': { value: '1', prefix: 'p', localName: 'id', namespace: 'urn:p' },
        plain: { value: 'a & b', prefix: null, localName: 'plain', namespace: null },
      },
    });
    expect(Object.keys(root.attributes)).toEqual(['p:id', 'plain']);
    expect(root.children.map(child => [child.name, child.namespace])).toEqual([
      ['child', 'urn:default'],
      ['p:empty', 'urn:p'],
      ['other', null],
    ]);
    expect(root.children[2].namespaces).toEqual({ p: 'urn:p' });
  });

  it('decodes text, references and CDATA', () => {
    expect(root.text).toBeUndefined();
    expect(root.children[0].text).toBe('Hello <world> AB <raw> ');
    expect(root.children[1]).toMatchObject({ children: [] });
    expect(root.children[1].text).toBeUndefined();
  });

  it('normalizes whitespace in attribute values', () => {
    expect(root.children[2].children[0].attributes.attr.value).toBe('x y');
  });

  it('maps paths to ranges', () => {
    const at = (...path: (string | number)[]) => getLocationForJsonPathInXml(result, path)?.range;
    expect(at()).toEqual(range(0, 0, 11, 0));
    expect(at('root')).toEqual(range(2, 0, 2, 71));
    expect(at('root', 'name')).toEqual(range(2, 1, 2, 7));
    expect(at('root', 'attributes', 'p:id')).toEqual(range(2, 44, 2, 52));
    expect(at('root', 'attributes', 'p:id', 'value')).toEqual(range(2, 50, 2, 51));
    expect(at('root', 'attributes', 'plain', 'value')).toEqual(range(2, 60, 2, 69));
    expect(at('root', 'namespaces', '')).toEqual(range(2, 24, 2, 43));
    expect(at('root', 'children', 0)).toEqual(range(3, 2, 3, 9));
    expect(at('root', 'children', 0, 'text')).toEqual(range(3, 9, 3, 56));
    expect(at('root', 'children', 2, 'children', 0, 'attributes', 'attr', 'value')).toEqual(range(7, 16, 8, 1));
    expect(at('root', 'children', 9)).toBeUndefined();
    expect(getLocationForJsonPathInXml(result, ['root', 'children', 9], true)?.range).toEqual(range(2, 71, 10, 0));
  });

  it('implements IParser', () => {
    expect(Xml.parse(source).data).toEqual(result.data);
    expect(Xml.trapAccess(result.data)).toBe(result.data);
    expect(Xml.getLocationForJsonPath(result, ['root'])).toEqual(getLocationForJsonPathInXml(result, ['root']));
  });

  it('handles a BOM, CRLF and a DOCTYPE', () => {
    const doc = parseXml('﻿<!DOCTYPE a [<!ENTITY x "y">]>\r\n<a>&x;\r\n</a>');
    expect(doc.data.doctype).toBe('a');
    expect(doc.data.root?.name).toBe('a');
    expect(doc.diagnostics).toEqual([
      {
        code: 'parser',
        message: 'Entity "&x;" is not expanded because DTDs are not parsed',
        range: range(1, 3, 1, 6),
        severity: DiagnosticSeverity.Warning,
      },
    ]);
  });

  describe('reports', () => {
    it.each([
      ['an empty document', '', 'Document has no root element'],
      ['multiple roots', '<a/><b/>', 'Only one root element is allowed'],
      ['text outside the root', '<a/>x', 'Text is not allowed outside the root element'],
      ['unclosed elements', '<a><b></a>', 'Element <b> is not closed'],
      ['mismatched closing tags', '<a></b></a>', 'Closing tag </b> does not match <a>'],
      ['unexpected closing tags', '<a/></b>', 'Unexpected closing tag </b>'],
      ['unclosed start tags', '<a', 'Start tag <a> is not closed'],
      ['unquoted values', '<a b=c/>', 'Value of attribute "b" must be quoted'],
      ['unclosed values', '<a b="c/>', 'Value of attribute "b" is not closed'],
      ['"<" in values', '<a b="<"/>', '"<" is not allowed in attribute values, use "&lt;" instead'],
      ['duplicate attributes', '<a b="1" b="2"/>', 'Duplicate attribute "b"'],
      [
        'duplicate expanded attributes',
        '<a xmlns:x="urn:x" xmlns:y="urn:x" x:b="1" y:b="2"/>',
        'Duplicate attribute "{urn:x}b"',
      ],
      ['unbound prefixes', '<x:a/>', 'Namespace prefix "x" is not bound'],
      ['invalid names', '<a:b:c xmlns:a="urn:a"/>', 'Invalid qualified name "a:b:c"'],
      ['unescaped "&"', '<a>&</a>', 'Unescaped "&", use "&amp;" instead'],
      ['undefined entities', '<a>&nbsp;</a>', 'Undefined entity "&nbsp;"'],
      ['invalid character references', '<a>&#0;</a>', 'Invalid character reference "&#0;"'],
      ['unclosed comments', '<a><!-- x</a>', 'Comment is not closed'],
      ['unclosed CDATA', '<a><![CDATA[ x</a>', 'CDATA section is not closed'],
      [
        'late XML declarations',
        '<a><?xml version="1.0"?></a>',
        'The XML declaration is only allowed at the start of the document',
      ],
      ['XML declarations without a version', '<?xml encoding="UTF-8"?><a/>', 'The XML declaration must have a version'],
      ['bad xmlns bindings', '<a xmlns:xml="urn:x"/>', 'Namespace prefix "xml" cannot be bound to "urn:x"'],
    ])('%s', (_name, input, message) => {
      expect(errors(input).map(({ message }) => message)).toContain(message);
    });

    it('with exact ranges', () => {
      expect(errors('<a>\n  <b>\n</a>')).toEqual([{ message: 'Element <b> is not closed', range: range(1, 2, 1, 4) }]);
      expect(errors('<a x:b="1"/>')).toEqual([
        { message: 'Namespace prefix "x" is not bound', range: range(0, 3, 0, 4) },
      ]);
    });

    it('and recovers', () => {
      const doc = parseXml('<a><b></c><d/></a>');
      expect(doc.data.root?.children.map(({ name }) => name)).toEqual(['b']);
      expect(doc.data.root?.children[0].children.map(({ name }) => name)).toEqual(['d']);
    });
  });
});

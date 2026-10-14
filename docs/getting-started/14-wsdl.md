# WSDL Support

Spectral has a built-in [WSDL 1.1](https://www.w3.org/TR/2001/NOTE-wsdl-20010315) ruleset that you can use to lint your SOAP service descriptions. It supports SOAP 1.1 and SOAP 1.2 bindings, and checks a subset of the [WS-I Basic Profile](https://www.ws-i.org/Profiles/BasicProfile-1.1.html).

Add `extends: "spectral:wsdl"` to your ruleset file to lint WSDL files:

```bash
echo 'extends: ["spectral:wsdl"]' > .spectral.yaml
spectral lint "services/**/*.wsdl"
```

The ruleset registers an XML parser for files with the `.wsdl` extension, so you don't need any extra configuration. Files with other extensions, such as `.xml`, are parsed as XML too when they start with `<` and have a `definitions` element in the WSDL 1.1 namespace near the top. XML syntax errors are reported as `parser` results with the exact location of the problem.

WSDL 2.0 (`<description xmlns="http://www.w3.org/ns/wsdl">`) is not supported.

## Data Model

The XML parser turns a document into a plain JSON tree, which is what your own rules target with JSONPath `given` expressions. Every element has the same shape, and namespace prefixes are resolved, so match on `namespace` and `localName` rather than on `name`, which depends on the prefixes the author chose:

```yaml
kind: xml
version: "1.0" # from the XML declaration, when present
encoding: UTF-8
root: # null when the document has no root element
  name: wsdl:definitions # the qualified name, as written
  prefix: wsdl # null when unprefixed
  localName: definitions
  namespace: http://schemas.xmlsoap.org/wsdl/ # null when the element is in no namespace
  attributes: # by qualified name; xmlns declarations are not included
    targetNamespace: { value: urn:example:petstore, prefix: null, localName: targetNamespace, namespace: null }
  namespaces: # every namespace in scope, inherited from ancestors; the default namespace has the key ""
    wsdl: http://schemas.xmlsoap.org/wsdl/
    tns: urn:example:petstore
  children: # child elements, in document order; comments and processing instructions are dropped
    - name: wsdl:documentation
      localName: documentation
      namespace: http://schemas.xmlsoap.org/wsdl/
      attributes: {}
      namespaces: { wsdl: http://schemas.xmlsoap.org/wsdl/, tns: urn:example:petstore }
      children: []
      text: Manage the pets of the store. # the element's own text and CDATA, omitted when it is only whitespace
```

For example, this rule requires every SOAP 1.1 operation to have a `soapAction`:

```yaml
extends: ["spectral:wsdl"]
rules:
  soap-action:
    given: "$.root.children[?(@.localName === 'binding')].children[*].children[?(@.namespace === 'http://schemas.xmlsoap.org/wsdl/soap/' && @.localName === 'operation')].attributes"
    then:
      field: soapAction
      function: truthy
```

Results point at the start tag of an element, or at the value of an attribute (`attributes.<name>.value`), so results show up on the line you need to change.

You can see a full list of the rules in this ruleset in [WSDL Rules](../reference/wsdl-rules.md).

## Parser Details

The parser is a small, non-validating XML 1.0 parser with namespace support:

- Character references and the five predefined entities (`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`) are decoded. A DOCTYPE is skipped, so other entities are not expanded: they are reported as an error, or as a warning when the document has a DOCTYPE.
- Line endings are normalized to `\n`, and whitespace in attribute values to spaces, as XML requires.
- Text is joined per element, so the order of text and child elements in mixed content is lost.
- Comments and processing instructions are dropped.
- Unbound namespace prefixes, duplicate attributes, mismatched or unclosed tags and other well-formedness errors are reported, and the parser recovers so that the rest of the document is still linted.

## Limitations

- Only one file is linted at a time. `wsdl:import`, `xsd:import` and `xsd:include` are not followed, so references into an imported namespace are not checked, and neither are references into an inline schema that includes another file.
- Inline XML Schemas in `wsdl:types` are only used to look up the top-level elements and types that message parts refer to. The schemas themselves are not validated.
- The rules check a subset of the WS-I Basic Profile, not all of it.

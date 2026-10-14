# WSDL Rules

Spectral has a built-in "wsdl" ruleset for [WSDL 1.1](https://www.w3.org/TR/2001/NOTE-wsdl-20010315) files. It checks that references resolve, a subset of the [WS-I Basic Profile 1.1](https://www.ws-i.org/Profiles/BasicProfile-1.1.html), naming and documentation, for both SOAP 1.1 and SOAP 1.2 bindings.

In your ruleset file you can add `extends: "spectral:wsdl"` and you'll get all of the following rules applied to your `.wsdl` files.

The examples below assume the usual prefixes: `wsdl` for `http://schemas.xmlsoap.org/wsdl/`, `soap` for `http://schemas.xmlsoap.org/wsdl/soap/`, `soap12` for `http://schemas.xmlsoap.org/wsdl/soap12/`, `xsd` for `http://www.w3.org/2001/XMLSchema`, and `tns` for the target namespace.

`wsdl:import`, and `xsd:import` and `xsd:include` in `wsdl:types`, are followed with Spectral's resolver, so references into imported WSDL files and schemas are checked. Imported files are not linted themselves. When an import cannot be loaded, references into its namespace are not checked.

## References

### wsdl-message-part-reference

Message parts must have either an `element` or a `type`, and not both. The namespace prefix must be bound. When the QName is in the target namespace of the document, or in the target namespace of an inline or imported schema, the element or type must be defined there as a top-level component. Built-in XML Schema types such as `xsd:string` are always accepted. The schemas themselves are not validated.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:message name="GetPetRequest">
  <wsdl:part name="parameters" element="tns:GetPetRequst"/>
</wsdl:message>
```

**Good Example**

```xml
<wsdl:types>
  <xsd:schema targetNamespace="urn:example:petstore">
    <xsd:element name="GetPetRequest" type="xsd:long"/>
  </xsd:schema>
</wsdl:types>
<wsdl:message name="GetPetRequest">
  <wsdl:part name="parameters" element="tns:GetPetRequest"/>
</wsdl:message>
```

### wsdl-operation-message-reference

The `input`, `output` and `fault` of port type operations must refer to a message defined in the document.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:portType name="PetPortType">
  <wsdl:operation name="GetPet">
    <wsdl:input message="tns:Missing"/>
  </wsdl:operation>
</wsdl:portType>
```

### wsdl-binding-port-type-reference

The `type` of a binding must refer to a port type defined in the document.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:binding name="PetSoapBinding" type="tns:Missing">
  ...
</wsdl:binding>
```

### wsdl-binding-operation-reference

Binding operations must be operations of the port type of the binding.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:portType name="PetPortType">
  <wsdl:operation name="GetPet">...</wsdl:operation>
</wsdl:portType>
<wsdl:binding name="PetSoapBinding" type="tns:PetPortType">
  <wsdl:operation name="DeletePet">...</wsdl:operation>
</wsdl:binding>
```

### wsdl-port-binding-reference

The `binding` of a service port must refer to a binding defined in the document.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:service name="PetService">
  <wsdl:port name="PetSoapPort" binding="tns:Missing">...</wsdl:port>
</wsdl:service>
```

## WS-I Basic Profile

### wsdl-binding-operations-complete

Every operation of a port type must be bound by each binding of that port type (R2718).

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:portType name="PetPortType">
  <wsdl:operation name="GetPet">...</wsdl:operation>
  <wsdl:operation name="AddPet">...</wsdl:operation>
</wsdl:portType>
<wsdl:binding name="PetSoapBinding" type="tns:PetPortType">
  <wsdl:operation name="GetPet">...</wsdl:operation>
</wsdl:binding>
```

### wsdl-no-encoded-use

`soap:body`, `soap:header`, `soap:headerfault` and `soap:fault` (and their `soap12` equivalents) must use `literal`, not `encoded` (R2706).

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:input>
  <soap:body use="encoded" encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"/>
</wsdl:input>
```

**Good Example**

```xml
<wsdl:input>
  <soap:body use="literal"/>
</wsdl:input>
```

### wsdl-document-literal-style

Prefer the document style over the rpc style. This rule is a warning, because rpc/literal is allowed by the Basic Profile.

**Recommended:** Yes

**Bad Example**

```xml
<soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
```

**Good Example**

```xml
<soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
```

### wsdl-binding-style-consistent

All operations of a SOAP binding must have the same style (R2705). The style of an operation is the `style` of its `soap:operation`, or else the `style` of the `soap:binding`, or else `document`.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:binding name="PetSoapBinding" type="tns:PetPortType">
  <soap:binding style="rpc" transport="http://schemas.xmlsoap.org/soap/http"/>
  <wsdl:operation name="GetPet">...</wsdl:operation>
  <wsdl:operation name="AddPet">
    <soap:operation style="document"/>
    ...
  </wsdl:operation>
</wsdl:binding>
```

### wsdl-soap-binding-transport

Bindings must have a `soap:binding` or `soap12:binding` with a `transport`. HTTP bindings, which have an `http:binding`, are skipped.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:binding name="PetSoapBinding" type="tns:PetPortType">
  <soap:binding style="document"/>
  ...
</wsdl:binding>
```

**Good Example**

```xml
<wsdl:binding name="PetSoapBinding" type="tns:PetPortType">
  <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
  ...
</wsdl:binding>
```

### wsdl-port-address

Service ports must have a `soap:address` or `soap12:address` with a `location`. Ports of an HTTP binding may use `http:address` instead.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:port name="PetSoapPort" binding="tns:PetSoapBinding"/>
```

**Good Example**

```xml
<wsdl:port name="PetSoapPort" binding="tns:PetSoapBinding">
  <soap:address location="https://petstore.example.com/soap"/>
</wsdl:port>
```

## Naming

### wsdl-names-unique

Messages, port types, bindings, services and ports must have unique names in the document. Operations must have unique names within a port type, so overloading is not allowed (R2304), and parts must have unique names within a message.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:message name="GetPetRequest">...</wsdl:message>
<wsdl:message name="GetPetRequest">...</wsdl:message>
```

### wsdl-names-pascal-case

Service, port type and binding names must be PascalCase, that is match `^[A-Z][A-Za-z0-9]*$`.

**Recommended:** Yes

**Bad Example**

```xml
<wsdl:service name="pet_service">...</wsdl:service>
```

**Good Example**

```xml
<wsdl:service name="PetService">...</wsdl:service>
```

## Documentation

### wsdl-documentation

Services and port types must have a non-empty `wsdl:documentation` element.

**Recommended:** Yes

**Good Example**

```xml
<wsdl:service name="PetService">
  <wsdl:documentation>The Petstore SOAP service.</wsdl:documentation>
  ...
</wsdl:service>
```

### wsdl-operation-documentation

Port type operations should have a non-empty `wsdl:documentation` element. This rule has the `info` severity.

**Recommended:** Yes

**Good Example**

```xml
<wsdl:operation name="GetPet">
  <wsdl:documentation>Returns a pet by its id.</wsdl:documentation>
  ...
</wsdl:operation>
```

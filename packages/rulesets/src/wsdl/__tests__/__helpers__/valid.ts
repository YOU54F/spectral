// A small, self-written Petstore SOAP service with SOAP 1.1 and SOAP 1.2 bindings that passes every rule.
export const valid = `<?xml version="1.0" encoding="UTF-8"?>
<wsdl:definitions name="Petstore"
    targetNamespace="urn:example:petstore"
    xmlns:wsdl="http://schemas.xmlsoap.org/wsdl/"
    xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
    xmlns:soap12="http://schemas.xmlsoap.org/wsdl/soap12/"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:tns="urn:example:petstore">
  <wsdl:documentation>Manage the pets of the store.</wsdl:documentation>
  <wsdl:types>
    <xsd:schema targetNamespace="urn:example:petstore" elementFormDefault="qualified">
      <xsd:complexType name="Pet">
        <xsd:sequence>
          <xsd:element name="id" type="xsd:long"/>
          <xsd:element name="name" type="xsd:string"/>
        </xsd:sequence>
      </xsd:complexType>
      <xsd:element name="GetPetRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="id" type="xsd:long"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="GetPetResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="pet" type="tns:Pet"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="AddPetRequest">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="pet" type="tns:Pet"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="AddPetResponse" type="tns:Pet"/>
      <xsd:element name="PetNotFound" type="xsd:string"/>
    </xsd:schema>
  </wsdl:types>

  <wsdl:message name="GetPetRequest">
    <wsdl:part name="parameters" element="tns:GetPetRequest"/>
  </wsdl:message>
  <wsdl:message name="GetPetResponse">
    <wsdl:part name="parameters" element="tns:GetPetResponse"/>
  </wsdl:message>
  <wsdl:message name="AddPetRequest">
    <wsdl:part name="parameters" element="tns:AddPetRequest"/>
  </wsdl:message>
  <wsdl:message name="AddPetResponse">
    <wsdl:part name="parameters" element="tns:AddPetResponse"/>
  </wsdl:message>
  <wsdl:message name="PetNotFound">
    <wsdl:part name="fault" element="tns:PetNotFound"/>
  </wsdl:message>

  <wsdl:portType name="PetPortType">
    <wsdl:documentation>Pet operations.</wsdl:documentation>
    <wsdl:operation name="GetPet">
      <wsdl:documentation>Returns a pet by its id.</wsdl:documentation>
      <wsdl:input message="tns:GetPetRequest"/>
      <wsdl:output message="tns:GetPetResponse"/>
      <wsdl:fault name="PetNotFound" message="tns:PetNotFound"/>
    </wsdl:operation>
    <wsdl:operation name="AddPet">
      <wsdl:documentation>Adds a pet to the store.</wsdl:documentation>
      <wsdl:input message="tns:AddPetRequest"/>
      <wsdl:output message="tns:AddPetResponse"/>
    </wsdl:operation>
  </wsdl:portType>

  <wsdl:binding name="PetSoapBinding" type="tns:PetPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <wsdl:operation name="GetPet">
      <soap:operation soapAction="urn:example:petstore:GetPet"/>
      <wsdl:input><soap:body use="literal"/></wsdl:input>
      <wsdl:output><soap:body use="literal"/></wsdl:output>
      <wsdl:fault name="PetNotFound"><soap:fault name="PetNotFound" use="literal"/></wsdl:fault>
    </wsdl:operation>
    <wsdl:operation name="AddPet">
      <soap:operation soapAction="urn:example:petstore:AddPet" style="document"/>
      <wsdl:input><soap:body use="literal"/></wsdl:input>
      <wsdl:output><soap:body use="literal"/></wsdl:output>
    </wsdl:operation>
  </wsdl:binding>

  <wsdl:binding name="PetSoap12Binding" type="tns:PetPortType">
    <soap12:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <wsdl:operation name="GetPet">
      <soap12:operation soapAction="urn:example:petstore:GetPet"/>
      <wsdl:input><soap12:body use="literal"/></wsdl:input>
      <wsdl:output><soap12:body use="literal"/></wsdl:output>
      <wsdl:fault name="PetNotFound"><soap12:fault name="PetNotFound" use="literal"/></wsdl:fault>
    </wsdl:operation>
    <wsdl:operation name="AddPet">
      <soap12:operation soapAction="urn:example:petstore:AddPet"/>
      <wsdl:input><soap12:body use="literal"/></wsdl:input>
      <wsdl:output><soap12:body use="literal"/></wsdl:output>
    </wsdl:operation>
  </wsdl:binding>

  <wsdl:service name="PetService">
    <wsdl:documentation>The Petstore SOAP service.</wsdl:documentation>
    <wsdl:port name="PetSoapPort" binding="tns:PetSoapBinding">
      <soap:address location="https://petstore.example.com/soap"/>
    </wsdl:port>
    <wsdl:port name="PetSoap12Port" binding="tns:PetSoap12Binding">
      <soap12:address location="https://petstore.example.com/soap12"/>
    </wsdl:port>
  </wsdl:service>
</wsdl:definitions>
`;

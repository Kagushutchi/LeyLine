export const inventarioWsdl = `<?xml version="1.0" encoding="UTF-8"?>
<definitions name="InventarioService"
  targetNamespace="http://leyline.com/soap/inventario"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:tns="http://leyline.com/soap/inventario"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">

  <types>
    <xsd:schema targetNamespace="http://leyline.com/soap/inventario" elementFormDefault="qualified">
      <xsd:element name="consultarInventario">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="productoId" type="xsd:string"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="consultarInventarioResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="inventario" type="tns:Inventario"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:complexType name="Inventario">
        <xsd:sequence>
          <xsd:element name="productoId" type="xsd:string"/>
          <xsd:element name="productor" type="xsd:string"/>
          <xsd:element name="cantidadDisponible" type="xsd:int"/>
          <xsd:element name="cantidadReservada" type="xsd:int"/>
          <xsd:element name="actualizadoEn" type="xsd:string"/>
        </xsd:sequence>
      </xsd:complexType>

      <xsd:element name="reservarStock">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="productoId" type="xsd:string"/>
            <xsd:element name="cantidad" type="xsd:int"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="reservarStockResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="reserva" type="tns:ReservaStock"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>

      <xsd:complexType name="ReservaStock">
        <xsd:sequence>
          <xsd:element name="exito" type="xsd:boolean"/>
          <xsd:element name="productoId" type="xsd:string"/>
          <xsd:element name="cantidadSolicitada" type="xsd:int"/>
          <xsd:element name="cantidadDisponible" type="xsd:int"/>
          <xsd:element name="cantidadReservada" type="xsd:int"/>
          <xsd:element name="mensaje" type="xsd:string"/>
        </xsd:sequence>
      </xsd:complexType>

      <xsd:element name="actualizarInventario">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="productoId" type="xsd:string"/>
            <xsd:element name="cantidadDisponible" type="xsd:int"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
      <xsd:element name="actualizarInventarioResponse">
        <xsd:complexType>
          <xsd:sequence>
            <xsd:element name="inventario" type="tns:Inventario"/>
          </xsd:sequence>
        </xsd:complexType>
      </xsd:element>
    </xsd:schema>
  </types>

  <message name="ConsultarInventarioInput">
    <part name="parameters" element="tns:consultarInventario"/>
  </message>
  <message name="ConsultarInventarioOutput">
    <part name="parameters" element="tns:consultarInventarioResponse"/>
  </message>
  <message name="ReservarStockInput">
    <part name="parameters" element="tns:reservarStock"/>
  </message>
  <message name="ReservarStockOutput">
    <part name="parameters" element="tns:reservarStockResponse"/>
  </message>
  <message name="ActualizarInventarioInput">
    <part name="parameters" element="tns:actualizarInventario"/>
  </message>
  <message name="ActualizarInventarioOutput">
    <part name="parameters" element="tns:actualizarInventarioResponse"/>
  </message>

  <portType name="InventarioPortType">
    <operation name="consultarInventario">
      <input message="tns:ConsultarInventarioInput"/>
      <output message="tns:ConsultarInventarioOutput"/>
    </operation>
    <operation name="reservarStock">
      <input message="tns:ReservarStockInput"/>
      <output message="tns:ReservarStockOutput"/>
    </operation>
    <operation name="actualizarInventario">
      <input message="tns:ActualizarInventarioInput"/>
      <output message="tns:ActualizarInventarioOutput"/>
    </operation>
  </portType>

  <binding name="InventarioBinding" type="tns:InventarioPortType">
    <soap:binding style="document" transport="http://schemas.xmlsoap.org/soap/http"/>
    <operation name="consultarInventario">
      <soap:operation soapAction="consultarInventario"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="reservarStock">
      <soap:operation soapAction="reservarStock"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
    <operation name="actualizarInventario">
      <soap:operation soapAction="actualizarInventario"/>
      <input><soap:body use="literal"/></input>
      <output><soap:body use="literal"/></output>
    </operation>
  </binding>

  <service name="InventarioService">
    <port name="InventarioPort" binding="tns:InventarioBinding">
      <soap:address location="http://localhost:3000/soap/inventario"/>
    </port>
  </service>
</definitions>
`;

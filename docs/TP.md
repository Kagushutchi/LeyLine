## UNIVERSIDAD ARGENTINA DE LA EMPRESA

## Departamento de Tecnología Informática

3.4.218 DESARROLLO DE APLICACIONES II

Docente: Parkinson, Christian

## Trabajo Práctico Inicial

Tipo: Desarrollo procedimental de aplicaciones orientadas a componentes

Tema: Introducción a arquitecturas orientadas a componentes

## Actividades obligatorias:

Instalación y configuración del entorno de desarrollo (IDE, JDK/Node/.NET según stack elegido, servidor de aplicaciones – Tomcat, WildFly, IIS, o contenedores Docker).

Creación de al menos tres componentes reutilizables independientes:

Componente de dominio (Pedido, Cliente, Producto).

Componente de acceso a datos (DAO/Repository).

Componente de utilidad (validación, logging, configuración).

Implementación de una aplicación multicapa simple (presentación → lógica de negocio → datos) que utilice los componentes anteriores.

Configuración de proyectos y gestión de dependencias (Maven/Gradle/npm/NuGet).

Ejercicios de acceso local y remoto entre componentes (invocación directa vs. acceso a través de interfaz/remoting básico).

Entregable: Diagrama de Clases + Diagrama de Componentes + Diagrama de Despliegue + Código fuente + informe breve de arquitectura de componentes + evidencias de ejecución local y remota.


## Trabajo Práctico Primera Parte

Tipo: Desarrollo procedimental de aplicaciones empresariales

Tema: Arquitectura de aplicaciones e integración

Actividades obligatorias:

Desarrollo de la aplicación utilizando un framework empresarial (Spring Boot, Quarkus, .NET Core, NestJS, etc.).

Implementación de patrones de diseño (Factory, Repository, Strategy, Observer, Facade).

Construcción de servicios orientados a componentes (Servicio de Pedidos, Servicio de Inventario, Servicio de Clientes).

Integración entre módulos internos mediante interfaces y eventos de dominio.

Modelado de procesos de negocio (BPMN simplificado o diagramas de secuencia) y arquitectura en capas (incluyendo capa de servicios).

Entregable: Aplicación empresarial funcional con documentación de patrones aplicados y diagrama de arquitectura en capas.

## Trabajo Práctico Segunda Parte

Tipo: Desarrollo procedimental de integración de aplicaciones

Tema: Integración sincrónica y asincrónica

Actividades obligatorias:

Implementación de servicios web:

Al menos un servicio SOAP (WSDL + contrato).

Al menos dos servicios REST (OpenAPI/Swagger).

Desarrollo de mecanismos de mensajería y colas (RabbitMQ, Kafka, ActiveMQ o Azure Service Bus / Amazon SQS).

Configuración de integración mediante arquitectura SOA / microservicios ligeros.

Implementación de productores y consumidores de mensajes (ej. “PedidoCreado”, “InventarioActualizado”).

Consumo e integración de al menos una API externa real (pagos, geolocalización, envíos, etc.).

Componente de IA (obligatorio en esta etapa o en el Integrador):


Integrar al menos uno de los siguientes componentes de Inteligencia Artificial:

Servicio de recomendaciones de productos (basado en historial o contenido) consumiendo una API de ML o un modelo simple.

Clasificación automática de la prioridad/urgencia de un pedido a partir de texto libre del cliente (usando un modelo de NLP o API de LLM).

Detección de anomalías en pedidos (montos, cantidades, patrones) mediante un modelo simple o servicio de IA.

Generación automática de respuestas o resúmenes de estado del pedido mediante un LLM (API de Grok/xAI, OpenAI, Hugging Face, o similar).

El componente de IA debe exponerse como un servicio REST o ser invocado de forma asincrónica a través de la cola de mensajes.

Entregable: Servicios SOAP/REST documentados + productores/consumidores + integración con API externa + componente de IA funcional + evidencias de prueba.

## Trabajo Práctico Integrador

Tipo: Desarrollo integral de aplicación distribuida

Tema: Diseño e implementación de una solución integrada

Actividades obligatorias:

Análisis de requerimientos funcionales y no funcionales (incluyendo requerimientos de IA: latencia, exactitud mínima, privacidad de datos).

Diseño de arquitectura de integración (diagramas de componentes, secuencia, despliegue y flujo de mensajes).

Desarrollo completo de componentes y servicios.

Implementación de mecanismos de comunicación sincrónica (REST/SOAP) y asincrónica (colas + eventos).

Integración de aplicaciones propias y de terceros (incluyendo el componente de IA y al menos una API externa).

Pruebas funcionales, de integración, de carga básica y validación del componente de IA.

Documentación técnica completa (arquitectura, contratos de servicios, configuración de colas, decisiones de diseño de IA, manual de despliegue).


Presentación y defensa del proyecto final (demo en vivo + explicación de decisiones arquitectónicas y del uso de IA).

## Requisitos mínimos de la solución final:

Arquitectura multicapa / orientada a componentes / SOA o microservicios.

Al menos un servicio SOAP y varios REST.

Cola de mensajes con productores y consumidores.

Componente de IA integrado y consumible.

Manejo de errores, logging y configuración externalizada.

Posibilidad de ejecución en entorno de laboratorio (contenedores recomendados).

## Plazo

Según lo indicado en el cronograma. Webcampus.

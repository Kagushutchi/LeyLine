

ClubCurator: Plataforma SaaS de Clubes de Suscripción (Vinos, Cafés o Cervezas)
Propuesta de Negocio: SaaS llave en mano para que creadores de marcas de nicho puedan lanzar y automatizar clubes de membresías mensuales con envíos personalizados.
Componentes del TP:
* Entidades: Suscripción (Pedido), Suscriptor (Cliente), CajaMensual (Producto)
* Servicio SOAP: Consulta de inventarios en tiempo real para las bodegas, tostaderos o productores asociados
* Servicios REST: Registro de preferencias organolépticas (sabores preferidos, alergias) y dashboard de membresía
* Colas (RabbitMQ/Kafka): Evento PagoRecurrentAprobado -> Dispara la generación de la orden de empaque en la bodega física (InventarioActualizado)
* API Externa: Stripe o MercadoPago Subscriptions para la facturación automática recurrente
* Componente de IA: Modelo de recomendación personalizado que arma la combinación óptima de botellas o variedades que recibirá el suscriptor en su caja de este mes según sus valoraciones previas
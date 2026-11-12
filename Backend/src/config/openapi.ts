const uuidParam = (name: string, description: string) => ({
  name,
  in: 'path',
  required: true,
  description,
  schema: { type: 'string', format: 'uuid' },
});

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Error' },
      example: { status: 'error', message: 'Descripción del error' },
    },
  },
});

const jsonResponse = (description: string, schema: string, example?: unknown) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: `#/components/schemas/${schema}` },
      ...(example !== undefined ? { example } : {}),
    },
  },
});

export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ClubCurator / LeyLine API',
    version: '1.0.0',
    description:
      'API REST de gestión de suscriptores, suscripciones, cajas mensuales y productos. ' +
      'El servicio SOAP de inventario se documenta aparte en docs/soap/inventario.wsdl.',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Desarrollo local',
    },
  ],
  tags: [
    { name: 'Sistema', description: 'Estado del servicio' },
    { name: 'Suscriptores', description: 'Alta, consulta y edición de clientes' },
    { name: 'Suscripciones', description: 'Membresías mensuales y cambios de estado' },
    { name: 'Cajas mensuales', description: 'Cajas temáticas y recomendaciones' },
    { name: 'Productos', description: 'Catálogo de vinos, cafés y cervezas' },
    { name: 'Solicitudes de suscripción', description: 'Alta de membresías por cola, con pago (requiere SUBSCRIPTION_REQUESTS_ENABLED)' },
    { name: 'Pagos', description: 'Webhooks del proveedor de pago' },
  ],
  paths: {
    '/api/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Healthcheck de la API',
        responses: {
          200: jsonResponse('Servicio operativo', 'HealthResponse', {
            status: 'ok',
            service: 'ClubCurator API',
            database: 'sqlite',
            databaseConnected: true,
            timestamp: '2026-11-05T12:00:00.000Z',
          }),
        },
      },
    },

    '/api/suscriptores': {
      get: {
        tags: ['Suscriptores'],
        summary: 'Listar suscriptores',
        responses: {
          200: jsonResponse('Listado de suscriptores', 'SuscriptorListResponse'),
        },
      },
      post: {
        tags: ['Suscriptores'],
        summary: 'Crear un suscriptor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuscriptorInput' },
              example: {
                nombre: 'Valentina',
                apellido: 'Rossi',
                email: 'valentina.rossi@example.com',
                telefono: '+54 11 2345-6789',
                preferenciasOrganolepticas: {
                  categoria: 'vinos',
                  perfilSabor: ['frutal', 'taninos suaves'],
                  intensidad: 'media',
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Suscriptor creado', 'SuscriptorResponse'),
          400: errorResponse('Datos inválidos'),
          409: errorResponse('Email duplicado'),
        },
      },
    },
    '/api/suscriptores/{id}': {
      parameters: [uuidParam('id', 'ID del suscriptor')],
      get: {
        tags: ['Suscriptores'],
        summary: 'Obtener un suscriptor por ID',
        responses: {
          200: jsonResponse('Suscriptor encontrado', 'SuscriptorResponse'),
          400: errorResponse('ID inválido'),
          404: errorResponse('Suscriptor no encontrado'),
        },
      },
      put: {
        tags: ['Suscriptores'],
        summary: 'Actualizar un suscriptor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuscriptorUpdate' },
              example: { telefono: '+54 11 9999-0000', activo: false },
            },
          },
        },
        responses: {
          200: jsonResponse('Suscriptor actualizado', 'SuscriptorResponse'),
          400: errorResponse('Datos inválidos'),
          404: errorResponse('Suscriptor no encontrado'),
        },
      },
      delete: {
        tags: ['Suscriptores'],
        summary: 'Eliminar un suscriptor',
        responses: {
          200: jsonResponse('Suscriptor eliminado', 'DeleteResponse'),
          404: errorResponse('Suscriptor no encontrado'),
        },
      },
    },

    '/api/suscripciones': {
      get: {
        tags: ['Suscripciones'],
        summary: 'Listar suscripciones',
        responses: {
          200: jsonResponse('Listado de suscripciones', 'SuscripcionListResponse'),
        },
      },
      post: {
        tags: ['Suscripciones'],
        summary: 'Crear una suscripción',
        description:
          'Antes de confirmar, consulta el inventario de cada producto de la caja vía SOAP. ' +
          'Si algún producto no tiene stock suficiente responde 409.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuscripcionInput' },
              example: {
                suscriptorId: '11111111-1111-4111-8111-111111111111',
                cajaMensualId: '22222222-2222-4222-8222-222222222222',
                montoMensual: 14500,
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Suscripción creada', 'SuscripcionResponse'),
          400: errorResponse('Datos inválidos o caja no disponible'),
          404: errorResponse('Suscriptor o caja no encontrados'),
          409: errorResponse('Stock insuficiente para la caja'),
          503: errorResponse('Servicio SOAP de inventario no disponible'),
        },
      },
    },
    '/api/suscripciones/{id}': {
      parameters: [uuidParam('id', 'ID de la suscripción')],
      get: {
        tags: ['Suscripciones'],
        summary: 'Obtener una suscripción por ID',
        responses: {
          200: jsonResponse('Suscripción encontrada', 'SuscripcionResponse'),
          400: errorResponse('ID inválido'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
      put: {
        tags: ['Suscripciones'],
        summary: 'Actualizar una suscripción',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SuscripcionUpdate' },
              example: { montoMensual: 15000, estado: 'pausada' },
            },
          },
        },
        responses: {
          200: jsonResponse('Suscripción actualizada', 'SuscripcionResponse'),
          400: errorResponse('Datos inválidos'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
      delete: {
        tags: ['Suscripciones'],
        summary: 'Eliminar una suscripción',
        responses: {
          200: jsonResponse('Suscripción eliminada', 'DeleteResponse'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
    },
    '/api/suscripciones/{id}/pausar': {
      parameters: [uuidParam('id', 'ID de la suscripción')],
      put: {
        tags: ['Suscripciones'],
        summary: 'Pausar una suscripción activa',
        responses: {
          200: jsonResponse('Suscripción pausada', 'SuscripcionResponse'),
          400: errorResponse('La suscripción no está activa'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
      patch: {
        tags: ['Suscripciones'],
        summary: 'Pausar una suscripción activa (alias PATCH)',
        responses: {
          200: jsonResponse('Suscripción pausada', 'SuscripcionResponse'),
          400: errorResponse('La suscripción no está activa'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
    },
    '/api/suscripciones/{id}/reanudar': {
      parameters: [uuidParam('id', 'ID de la suscripción')],
      put: {
        tags: ['Suscripciones'],
        summary: 'Reanudar una suscripción pausada (retoma el cobro en el proveedor de pago)',
        responses: {
          200: jsonResponse('Suscripción reanudada', 'SuscripcionResponse'),
          400: errorResponse('La suscripción no está pausada'),
          404: errorResponse('Suscripción no encontrada'),
          502: errorResponse('El proveedor de pago no pudo reanudar la suscripción'),
        },
      },
      patch: {
        tags: ['Suscripciones'],
        summary: 'Reanudar una suscripción pausada (alias PATCH)',
        responses: {
          200: jsonResponse('Suscripción reanudada', 'SuscripcionResponse'),
          400: errorResponse('La suscripción no está pausada'),
          404: errorResponse('Suscripción no encontrada'),
          502: errorResponse('El proveedor de pago no pudo reanudar la suscripción'),
        },
      },
    },
    '/api/suscripciones/{id}/portal': {
      parameters: [uuidParam('id', 'ID de la suscripción')],
      post: {
        tags: ['Suscripciones'],
        summary: 'Abrir el portal de facturación del proveedor de pago',
        description: 'Devuelve la URL donde el cliente actualiza su tarjeta y consulta sus facturas.',
        responses: {
          200: jsonResponse('URL del portal', 'PortalResponse', { status: 'success', data: { url: 'https://billing.stripe.com/p/session/...' } }),
          400: errorResponse('La suscripción no tiene un medio de pago asociado'),
          502: errorResponse('El proveedor de pago no pudo abrir el portal'),
          503: errorResponse('El proveedor de pago no está disponible'),
        },
      },
    },
    '/api/solicitudes-suscripcion': {
      post: {
        tags: ['Solicitudes de suscripción'],
        summary: 'Solicitar una membresía (se procesa por cola y se paga en el proveedor)',
        description:
          'Responde 202 con la solicitud en `pendiente`. El worker crea el checkout del proveedor y la solicitud pasa a ' +
          '`esperando_pago` con su `checkoutUrl`; al confirmarse el pago por webhook pasa a `completado`. ' +
          'El precio de la caja está en pesos y el proveedor cobra en su moneda al tipo de cambio configurado (`cobro`). ' +
          'Requiere el header `Idempotency-Key`.',
        parameters: [{ name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', maxLength: 128 } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SolicitudRequest' } } },
        },
        responses: {
          202: jsonResponse('Solicitud recibida', 'SolicitudResponse'),
          400: errorResponse('Datos inválidos'),
          409: errorResponse('PRICE_CHANGED, ALREADY_SUBSCRIBED, REQUEST_IN_PROGRESS o IDEMPOTENCY_KEY_CONFLICT'),
        },
      },
      get: {
        tags: ['Solicitudes de suscripción'],
        summary: 'Listar las solicitudes del suscriptor autenticado',
        responses: { 200: jsonResponse('Solicitudes', 'SolicitudListResponse') },
      },
    },
    '/api/solicitudes-suscripcion/{id}': {
      parameters: [uuidParam('id', 'ID de la solicitud')],
      get: {
        tags: ['Solicitudes de suscripción'],
        summary: 'Consultar una solicitud',
        description: 'Con `?waitMs=N` (máx. 5000) la respuesta espera hasta que la solicitud deje de estar en curso (`esperando_pago` o un estado terminal).',
        parameters: [{ name: 'waitMs', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 5000 } }],
        responses: { 200: jsonResponse('Solicitud', 'SolicitudResponse'), 404: errorResponse('Solicitud no encontrada') },
      },
    },
    '/api/solicitudes-suscripcion/{id}/cancelar': {
      parameters: [uuidParam('id', 'ID de la solicitud')],
      post: {
        tags: ['Solicitudes de suscripción'],
        summary: 'Descartar un pedido que espera el pago',
        description: 'Invalida el checkout en el proveedor y deja la solicitud en `expirado`, liberando la caja. Idempotente.',
        responses: {
          200: jsonResponse('Solicitud descartada', 'SolicitudResponse'),
          404: errorResponse('Solicitud no encontrada'),
          409: errorResponse('El pedido no espera el pago, o el pago ya se completó'),
          503: errorResponse('El proveedor de pago no está disponible'),
        },
      },
    },
    '/api/webhooks/payments': {
      post: {
        tags: ['Pagos'],
        summary: 'Webhook del proveedor de pago activo',
        description:
          'Sin JWT: se autentica con la firma del proveedor (`Stripe-Signature` o `X-Fake-Signature`) sobre el cuerpo crudo. ' +
          'Verifica, normaliza y encola el evento (`payment.event`); responde 200 enseguida. ' +
          'Eventos: invoice.paid, invoice.payment_failed, customer.subscription.deleted, checkout.session.expired. ' +
          'Sólo se monta con PAYMENT_PROVIDER distinto de `none`.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object' } } } },
        responses: {
          200: { description: 'Evento recibido (también los duplicados y los que no interesan)' },
          400: errorResponse('Firma inválida'),
        },
      },
    },
    '/api/suscripciones/{id}/cancelar': {
      parameters: [uuidParam('id', 'ID de la suscripción')],
      put: {
        tags: ['Suscripciones'],
        summary: 'Cancelar una suscripción',
        responses: {
          200: jsonResponse('Suscripción cancelada', 'SuscripcionResponse'),
          400: errorResponse('La suscripción ya está cancelada'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
      patch: {
        tags: ['Suscripciones'],
        summary: 'Cancelar una suscripción (alias PATCH)',
        responses: {
          200: jsonResponse('Suscripción cancelada', 'SuscripcionResponse'),
          400: errorResponse('La suscripción ya está cancelada'),
          404: errorResponse('Suscripción no encontrada'),
        },
      },
    },
    '/api/suscripciones/cliente/{suscriptorId}': {
      parameters: [uuidParam('suscriptorId', 'ID del suscriptor')],
      get: {
        tags: ['Suscripciones'],
        summary: 'Listar suscripciones de un cliente',
        responses: {
          200: jsonResponse('Suscripciones del cliente', 'SuscripcionListResponse'),
          400: errorResponse('ID inválido'),
        },
      },
    },
    '/api/suscripciones/suscriptor/{suscriptorId}': {
      parameters: [uuidParam('suscriptorId', 'ID del suscriptor')],
      get: {
        tags: ['Suscripciones'],
        summary: 'Listar suscripciones de un suscriptor (alias)',
        responses: {
          200: jsonResponse('Suscripciones del suscriptor', 'SuscripcionListResponse'),
          400: errorResponse('ID inválido'),
        },
      },
    },

    '/api/cajas-mensuales': {
      get: {
        tags: ['Cajas mensuales'],
        summary: 'Listar cajas mensuales',
        responses: {
          200: jsonResponse('Listado de cajas', 'CajaMensualListResponse'),
        },
      },
      post: {
        tags: ['Cajas mensuales'],
        summary: 'Crear una caja mensual',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CajaMensualInput' },
              example: {
                nombre: 'Caja Gran Terroir',
                categoria: 'vinos',
                mes: 10,
                anio: 2026,
                descripcion: 'Selección de tres vinos premium de Mendoza.',
                precioBase: 14500,
                composiciones: [
                  {
                    productoId: '33333333-3333-4333-8333-333333333333',
                    cantidad: 2,
                    orden: 1,
                  },
                ],
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Caja creada', 'CajaMensualResponse'),
          400: errorResponse('Datos inválidos'),
          404: errorResponse('Producto no encontrado'),
        },
      },
    },
    '/api/cajas-mensuales/{id}': {
      parameters: [uuidParam('id', 'ID de la caja mensual')],
      get: {
        tags: ['Cajas mensuales'],
        summary: 'Obtener una caja por ID',
        responses: {
          200: jsonResponse('Caja encontrada', 'CajaMensualResponse'),
          400: errorResponse('ID inválido'),
          404: errorResponse('Caja no encontrada'),
        },
      },
      put: {
        tags: ['Cajas mensuales'],
        summary: 'Actualizar una caja mensual',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CajaMensualUpdate' },
              example: { disponible: false },
            },
          },
        },
        responses: {
          200: jsonResponse('Caja actualizada', 'CajaMensualResponse'),
          400: errorResponse('Datos inválidos'),
          404: errorResponse('Caja no encontrada'),
        },
      },
      delete: {
        tags: ['Cajas mensuales'],
        summary: 'Eliminar una caja mensual',
        responses: {
          200: jsonResponse('Caja eliminada', 'DeleteResponse'),
          404: errorResponse('Caja no encontrada'),
          409: errorResponse('La caja tiene suscripciones asociadas'),
        },
      },
    },
    '/api/cajas-mensuales/periodo/{anio}/{mes}': {
      parameters: [
        {
          name: 'anio',
          in: 'path',
          required: true,
          schema: { type: 'integer', minimum: 2000 },
          example: 2026,
        },
        {
          name: 'mes',
          in: 'path',
          required: true,
          schema: { type: 'integer', minimum: 1, maximum: 12 },
          example: 10,
        },
      ],
      get: {
        tags: ['Cajas mensuales'],
        summary: 'Listar cajas de un período',
        responses: {
          200: jsonResponse('Cajas del período', 'CajaMensualListResponse'),
          400: errorResponse('Período inválido'),
        },
      },
    },
    '/api/cajas-mensuales/recomendar': {
      post: {
        tags: ['Cajas mensuales'],
        summary: 'Generar una recomendación de caja',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['suscriptorId'],
                properties: {
                  suscriptorId: { type: 'string', format: 'uuid' },
                  preferencias: { type: 'object', additionalProperties: true },
                },
              },
              example: {
                suscriptorId: '11111111-1111-4111-8111-111111111111',
                preferencias: { categoria: 'vinos', intensidad: 'alta' },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Recomendación generada', 'CajaMensualRecomendada'),
          400: errorResponse('Suscriptor inválido'),
        },
      },
    },
    '/api/cajas-mensuales/recomendar-general': {
      post: {
        tags: ['Cajas mensuales'],
        summary: 'Generar una recomendación de caja según la demanda de todos los suscriptores',
        responses: {
          200: jsonResponse('Recomendación generada', 'CajaMensualRecomendada'),
          400: errorResponse('Falta configurar DEEPSEEK_API_KEY'),
        },
      },
    },
    '/api/cajas-mensuales/recomendar-existentes': {
      post: {
        tags: ['Cajas mensuales'],
        summary: 'Recomendar cajas existentes según las preferencias del suscriptor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  suscriptorId: { type: 'string', format: 'uuid', description: 'Solo para admin. Un suscriptor lo resuelve de su sesión.' },
                },
              },
            },
          },
        },
        responses: {
          200: jsonResponse('Recomendaciones generadas', 'CajasRecomendadas'),
          400: errorResponse('Falta configurar DEEPSEEK_API_KEY'),
        },
      },
    },

    '/api/productos': {
      get: {
        tags: ['Productos'],
        summary: 'Listar productos',
        responses: {
          200: jsonResponse('Listado de productos', 'ProductoListResponse'),
        },
      },
      post: {
        tags: ['Productos'],
        summary: 'Crear un producto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductoInput' },
              example: {
                nombre: 'Malbec Reserva Zuccardi',
                categoria: 'vinos',
                tipo: 'Tinto Reserva',
                productor: 'Familia Zuccardi',
                perfilNotas: ['ciruela madura', 'chocolate amargo'],
                sku: 'VIN-ZUC-MAL-001',
                precioReferencia: 4800,
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Producto creado', 'ProductoResponse'),
          400: errorResponse('Datos inválidos'),
          409: errorResponse('SKU duplicado'),
        },
      },
    },
    '/api/productos/{id}': {
      parameters: [uuidParam('id', 'ID del producto')],
      get: {
        tags: ['Productos'],
        summary: 'Obtener un producto por ID',
        responses: {
          200: jsonResponse('Producto encontrado', 'ProductoResponse'),
          400: errorResponse('ID inválido'),
          404: errorResponse('Producto no encontrado'),
        },
      },
      put: {
        tags: ['Productos'],
        summary: 'Actualizar un producto',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductoUpdate' },
              example: { precioReferencia: 5200, activo: false },
            },
          },
        },
        responses: {
          200: jsonResponse('Producto actualizado', 'ProductoResponse'),
          400: errorResponse('Datos inválidos'),
          404: errorResponse('Producto no encontrado'),
        },
      },
      delete: {
        tags: ['Productos'],
        summary: 'Eliminar un producto',
        responses: {
          200: jsonResponse('Producto eliminado', 'DeleteResponse'),
          404: errorResponse('Producto no encontrado'),
          409: errorResponse('El producto está asociado a una caja o tiene stock'),
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        required: ['status', 'message'],
        properties: {
          status: { type: 'string', example: 'error' },
          message: { type: 'string', example: 'El email no tiene un formato válido' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          service: { type: 'string', example: 'ClubCurator API' },
          database: { type: 'string', example: 'sqlite' },
          databaseConnected: { type: 'boolean', example: true },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Direccion: {
        type: 'object',
        additionalProperties: true,
        properties: {
          calle: { type: 'string' },
          numero: { type: 'string' },
          piso: { type: 'string' },
          departamento: { type: 'string' },
          ciudad: { type: 'string' },
          provincia: { type: 'string' },
          codigoPostal: { type: 'string' },
          pais: { type: 'string' },
        },
      },
      PreferenciasOrganolepticas: {
        type: 'object',
        additionalProperties: true,
        properties: {
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          perfilSabor: { type: 'array', items: { type: 'string' } },
          intensidad: { type: 'string' },
          alergiasRestricciones: { type: 'array', items: { type: 'string' } },
          notasAdicionales: { type: 'string' },
        },
      },
      Suscriptor: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string' },
          apellido: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email' },
          telefono: { type: 'string', nullable: true },
          documento: { type: 'string', nullable: true },
          direccion: { $ref: '#/components/schemas/Direccion' },
          preferenciasOrganolepticas: { $ref: '#/components/schemas/PreferenciasOrganolepticas' },
          activo: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SuscriptorInput: {
        type: 'object',
        required: ['nombre', 'email'],
        properties: {
          nombre: { type: 'string', maxLength: 150 },
          apellido: { type: 'string', maxLength: 150 },
          email: { type: 'string', format: 'email', maxLength: 150 },
          telefono: { type: 'string', maxLength: 50 },
          documento: { type: 'string', maxLength: 50 },
          direccion: { $ref: '#/components/schemas/Direccion' },
          preferenciasOrganolepticas: { $ref: '#/components/schemas/PreferenciasOrganolepticas' },
          activo: { type: 'boolean' },
        },
      },
      SuscriptorUpdate: {
        type: 'object',
        properties: {
          nombre: { type: 'string', maxLength: 150 },
          apellido: { type: 'string', maxLength: 150 },
          email: { type: 'string', format: 'email', maxLength: 150 },
          telefono: { type: 'string', maxLength: 50 },
          documento: { type: 'string', maxLength: 50 },
          direccion: { $ref: '#/components/schemas/Direccion' },
          preferenciasOrganolepticas: { $ref: '#/components/schemas/PreferenciasOrganolepticas' },
          activo: { type: 'boolean' },
        },
      },
      SuscriptorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { $ref: '#/components/schemas/Suscriptor' },
        },
      },
      SuscriptorListResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Suscriptor' } },
        },
      },
      Producto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string' },
          descripcion: { type: 'string', nullable: true },
          categoria: { type: 'string', example: 'vinos' },
          tipo: { type: 'string' },
          productor: { type: 'string' },
          perfilNotas: { type: 'array', items: { type: 'string' } },
          alergenosRestricciones: { type: 'array', items: { type: 'string' } },
          sku: { type: 'string', nullable: true },
          precioReferencia: { type: 'number', nullable: true },
          activo: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductoInput: {
        type: 'object',
        required: ['nombre', 'categoria', 'tipo', 'productor'],
        properties: {
          nombre: { type: 'string', maxLength: 150 },
          descripcion: { type: 'string', maxLength: 2000 },
          categoria: { type: 'string', maxLength: 50 },
          tipo: { type: 'string', maxLength: 100 },
          productor: { type: 'string', maxLength: 150 },
          perfilNotas: { type: 'array', items: { type: 'string' } },
          alergenosRestricciones: { type: 'array', items: { type: 'string' } },
          sku: { type: 'string', maxLength: 100 },
          precioReferencia: { type: 'number', minimum: 0 },
          activo: { type: 'boolean' },
        },
      },
      ProductoUpdate: {
        type: 'object',
        properties: {
          nombre: { type: 'string', maxLength: 150 },
          descripcion: { type: 'string', maxLength: 2000 },
          categoria: { type: 'string', maxLength: 50 },
          tipo: { type: 'string', maxLength: 100 },
          productor: { type: 'string', maxLength: 150 },
          perfilNotas: { type: 'array', items: { type: 'string' } },
          alergenosRestricciones: { type: 'array', items: { type: 'string' } },
          sku: { type: 'string', maxLength: 100 },
          precioReferencia: { type: 'number', minimum: 0 },
          activo: { type: 'boolean' },
        },
      },
      ProductoResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { $ref: '#/components/schemas/Producto' },
        },
      },
      ProductoListResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Producto' } },
        },
      },
      Composicion: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          cajaMensualId: { type: 'string', format: 'uuid' },
          productoId: { type: 'string', format: 'uuid' },
          cantidad: { type: 'integer', minimum: 1 },
          orden: { type: 'integer', nullable: true },
          precioAplicado: { type: 'number', nullable: true },
          producto: { $ref: '#/components/schemas/Producto' },
        },
      },
      ComposicionInput: {
        type: 'object',
        required: ['productoId', 'cantidad'],
        properties: {
          productoId: { type: 'string', format: 'uuid' },
          cantidad: { type: 'integer', minimum: 1 },
          orden: { type: 'integer' },
          precioAplicado: { type: 'number', minimum: 0 },
        },
      },
      CajaMensual: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string' },
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          mes: { type: 'integer', minimum: 1, maximum: 12 },
          anio: { type: 'integer', minimum: 2000 },
          descripcion: { type: 'string', nullable: true },
          precioBase: { type: 'number' },
          disponible: { type: 'boolean' },
          composiciones: {
            type: 'array',
            items: { $ref: '#/components/schemas/Composicion' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CajaMensualInput: {
        type: 'object',
        required: ['nombre', 'categoria', 'mes', 'anio'],
        properties: {
          nombre: { type: 'string', maxLength: 150 },
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          mes: { type: 'integer', minimum: 1, maximum: 12 },
          anio: { type: 'integer', minimum: 2000 },
          descripcion: { type: 'string', maxLength: 2000 },
          precioBase: { type: 'number', minimum: 0 },
          disponible: { type: 'boolean' },
          composiciones: {
            type: 'array',
            items: { $ref: '#/components/schemas/ComposicionInput' },
          },
        },
      },
      CajaMensualUpdate: {
        type: 'object',
        properties: {
          nombre: { type: 'string', maxLength: 150 },
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          mes: { type: 'integer', minimum: 1, maximum: 12 },
          anio: { type: 'integer', minimum: 2000 },
          descripcion: { type: 'string', maxLength: 2000 },
          precioBase: { type: 'number', minimum: 0 },
          disponible: { type: 'boolean' },
          composiciones: {
            type: 'array',
            items: { $ref: '#/components/schemas/ComposicionInput' },
          },
        },
      },
      CajaMensualRecomendada: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
              mes: { type: 'integer' },
              anio: { type: 'integer' },
              descripcion: { type: 'string' },
              precioBase: { type: 'number' },
              disponible: { type: 'boolean' },
              composiciones: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      CajasRecomendadas: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                cajaMensualId: { type: 'string', format: 'uuid' },
                motivo: { type: 'string' },
              },
            },
          },
        },
      },
      CajaMensualResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { $ref: '#/components/schemas/CajaMensual' },
        },
      },
      CajaMensualListResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/CajaMensual' } },
        },
      },
      Suscripcion: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          suscriptorId: { type: 'string', format: 'uuid' },
          cajaMensualId: { type: 'string', format: 'uuid' },
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          estado: { type: 'string', enum: ['activa', 'pausada', 'cancelada'] },
          montoMensual: { type: 'number' },
          fechaInicio: { type: 'string', format: 'date', nullable: true },
          proximoCobro: { type: 'string', format: 'date', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SuscripcionInput: {
        type: 'object',
        required: ['suscriptorId', 'cajaMensualId', 'montoMensual'],
        properties: {
          suscriptorId: { type: 'string', format: 'uuid' },
          cajaMensualId: { type: 'string', format: 'uuid' },
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          estado: { type: 'string', enum: ['activa', 'pausada', 'cancelada'] },
          montoMensual: { type: 'number', minimum: 0, exclusiveMinimum: true },
          fechaInicio: { type: 'string', format: 'date' },
          proximoCobro: { type: 'string', format: 'date' },
        },
      },
      SuscripcionUpdate: {
        type: 'object',
        properties: {
          suscriptorId: { type: 'string', format: 'uuid' },
          cajaMensualId: { type: 'string', format: 'uuid' },
          categoria: { type: 'string', enum: ['vinos', 'cafes', 'cervezas'] },
          estado: { type: 'string', enum: ['activa', 'pausada', 'cancelada'] },
          montoMensual: { type: 'number', minimum: 0, exclusiveMinimum: true },
          fechaInicio: { type: 'string', format: 'date' },
          proximoCobro: { type: 'string', format: 'date' },
        },
      },
      PortalResponse: {
        type: 'object',
        properties: { status: { type: 'string', example: 'success' }, data: { type: 'object', properties: { url: { type: 'string' } } } },
      },
      SolicitudRequest: {
        type: 'object',
        required: ['cajaMensualId', 'precioConfirmadoCentavos'],
        properties: {
          cajaMensualId: { type: 'string', format: 'uuid' },
          precioConfirmadoCentavos: { type: 'integer', description: 'Precio de la caja en centavos de la moneda base (pesos)', example: 650000 },
        },
      },
      Solicitud: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          cajaMensualId: { type: 'string', format: 'uuid' },
          estado: { type: 'string', enum: ['pendiente', 'procesando', 'esperando_pago', 'completado', 'rechazado', 'fallido', 'expirado'] },
          suscripcionId: { type: 'string', format: 'uuid', nullable: true },
          checkoutUrl: { type: 'string', description: 'Sólo en `esperando_pago`' },
          cobro: {
            type: 'object',
            description: 'Importe que cobra el proveedor (convertido de pesos al tipo de cambio configurado)',
            properties: { monto: { type: 'string', example: '5.42' }, moneda: { type: 'string', example: 'USD' } },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      SolicitudResponse: {
        type: 'object',
        properties: { status: { type: 'string', example: 'success' }, data: { $ref: '#/components/schemas/Solicitud' } },
      },
      SolicitudListResponse: {
        type: 'object',
        properties: { status: { type: 'string', example: 'success' }, data: { type: 'array', items: { $ref: '#/components/schemas/Solicitud' } } },
      },
      SuscripcionResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { $ref: '#/components/schemas/Suscripcion' },
        },
      },
      SuscripcionListResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Suscripcion' } },
        },
      },
      DeleteResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              success: { type: 'object', description: 'Registro eliminado' },
              id: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
    },
  },
};

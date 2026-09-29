import 'reflect-metadata';
import { DataSource } from 'typeorm';
import DBEngineFactory from '../common/patterns/factory/db-engine-factory';
import { logger } from '../common/utils/logger';

import { Producto } from '../modules/productos/infrastructure/producto.entity';
import { CajaMensual } from '../modules/cajas-mensuales/infrastructure/caja-mensual.entity';
import { CajaMensualProducto } from '../modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity';
import { Suscriptor } from '../modules/suscriptores/infrastructure/suscriptor.entity';
import { Suscripcion } from '../modules/suscripciones/infrastructure/suscripcion.entity';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Agrega `offsetDays` días a hoy y devuelve la fecha resultante. */
const dateOffset = (offsetDays: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d;
};

// ─── Datos de Productos ───────────────────────────────────────────────────────

const productosData: Partial<Producto>[] = [
  // Vinos
  {
    nombre: 'Malbec Reserva Zuccardi',
    descripcion: 'Malbec de alta gama de Valle de Uco, con 18 meses en roble francés.',
    categoria: 'vinos',
    tipo: 'Tinto Reserva',
    productor: 'Familia Zuccardi',
    perfilNotas: ['ciruela madura', 'chocolate amargo', 'vainilla', 'cuero'],
    alergenosRestricciones: ['sulfitos'],
    sku: 'VIN-ZUC-MAL-001',
    precioReferencia: 4800,
    activo: true,
  },
  {
    nombre: 'Torrontés Crios Susana Balbo',
    descripcion: 'Torrontés aromático y fresco de Cafayate, ideal para acompañar mariscos.',
    categoria: 'vinos',
    tipo: 'Blanco',
    productor: 'Susana Balbo Wines',
    perfilNotas: ['durazno', 'rosas', 'lima', 'miel'],
    alergenosRestricciones: ['sulfitos'],
    sku: 'VIN-BAL-TOR-001',
    precioReferencia: 3200,
    activo: true,
  },
  {
    nombre: 'Cabernet Sauvignon Gran Corte Catena',
    descripcion: 'Gran corte de Cabernet Sauvignon y Malbec, expresión máxima de Mendoza.',
    categoria: 'vinos',
    tipo: 'Tinto Gran Corte',
    productor: 'Catena Zapata',
    perfilNotas: ['cassis', 'tabaco', 'cedro', 'grafito'],
    alergenosRestricciones: ['sulfitos'],
    sku: 'VIN-CAT-CAB-001',
    precioReferencia: 7500,
    activo: true,
  },
  // Cafés
  {
    nombre: 'Blend Etiopía + Colombia Single Origin',
    descripcion: 'Mezcla artesanal de granos lavados de Yirgacheffe y Huila, tostado medio.',
    categoria: 'cafes',
    tipo: 'Blend Artesanal',
    productor: 'Café Quínoa Tostadores',
    perfilNotas: ['arándano', 'mandarina', 'caramelo', 'jazmín'],
    alergenosRestricciones: [],
    sku: 'CAF-QUI-ETH-COL-001',
    precioReferencia: 1850,
    activo: true,
  },
  {
    nombre: 'Geisha Panamá Natural',
    descripcion: 'Geisha procesado natural de Boquete, Panamá. Edición limitada.',
    categoria: 'cafes',
    tipo: 'Single Origin',
    productor: 'Hacienda La Esmeralda',
    perfilNotas: ['melocotón', 'mango', 'bergamota', 'té negro'],
    alergenosRestricciones: [],
    sku: 'CAF-ESM-GEI-001',
    precioReferencia: 3400,
    activo: true,
  },
  {
    nombre: 'Espresso Oscuro Arábica Brasil',
    descripcion: 'Granos cereza de Minas Gerais, tostado oscuro, cuerpo pleno.',
    categoria: 'cafes',
    tipo: 'Espresso',
    productor: 'Fazenda Santa Inés',
    perfilNotas: ['chocolate negro', 'nuez', 'melaza'],
    alergenosRestricciones: [],
    sku: 'CAF-SIN-ESP-001',
    precioReferencia: 1600,
    activo: true,
  },
  // Cervezas
  {
    nombre: 'IPA Lupulada Antares',
    descripcion: 'India Pale Ale con lúpulos Citra y Mosaic, amargor equilibrado.',
    categoria: 'cervezas',
    tipo: 'IPA',
    productor: 'Cervecería Antares',
    perfilNotas: ['pomelo', 'pino', 'mango', 'lúpulo floral'],
    alergenosRestricciones: ['gluten', 'cebada'],
    sku: 'CER-ANT-IPA-001',
    precioReferencia: 980,
    activo: true,
  },
  {
    nombre: 'Stout Imperial Patagonia',
    descripcion: 'Stout imperial con cuerpo robusto, notas de café y chocolate. 8,5% ABV.',
    categoria: 'cervezas',
    tipo: 'Imperial Stout',
    productor: 'Cervecería Patagonia',
    perfilNotas: ['café espresso', 'chocolate amargo', 'regaliz', 'vainilla'],
    alergenosRestricciones: ['gluten', 'cebada', 'levadura'],
    sku: 'CER-PAT-STO-001',
    precioReferencia: 1250,
    activo: true,
  },
  {
    nombre: 'Wheat Ale Kranz',
    descripcion: 'Cerveza de trigo estilo alemán, turbia y refrescante con notas cítricas.',
    categoria: 'cervezas',
    tipo: 'Wheat Ale',
    productor: 'Fábrica de Birra Kranz',
    perfilNotas: ['banana', 'clavo de olor', 'limón', 'trigo'],
    alergenosRestricciones: ['gluten', 'trigo', 'levadura'],
    sku: 'CER-KRA-WHE-001',
    precioReferencia: 870,
    activo: true,
  },
];

// ─── Datos de Suscriptores ────────────────────────────────────────────────────

const suscriptoresData: Partial<Suscriptor>[] = [
  {
    nombre: 'Valentina',
    apellido: 'Rossi',
    email: 'valentina.rossi@example.com',
    telefono: '+54 11 2345-6789',
    documento: '32.100.111',
    direccion: {
      calle: 'Av. del Libertador',
      numero: '4520',
      piso: '7',
      departamento: 'B',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1425',
      pais: 'Argentina',
    },
    preferenciasOrganolepticas: {
      categoria: 'vinos',
      perfilSabor: ['frutal', 'taninos suaves', 'acidez media'],
      intensidad: 'media',
      alergiasRestricciones: [],
      notasAdicionales: 'Prefiere tintos de Mendoza y Patagonia.',
    },
    activo: true,
  },
  {
    nombre: 'Matías',
    apellido: 'Fernández',
    email: 'matias.fernandez@example.com',
    telefono: '+54 11 3456-7890',
    documento: '28.200.222',
    direccion: {
      calle: 'Corrientes',
      numero: '1800',
      ciudad: 'Rosario',
      provincia: 'Santa Fe',
      codigoPostal: '2000',
      pais: 'Argentina',
    },
    preferenciasOrganolepticas: {
      categoria: 'cafes',
      perfilSabor: ['floral', 'frutado', 'acidez alta'],
      intensidad: 'alta',
      alergiasRestricciones: [],
      notasAdicionales: 'Fanático de los single origins africanos y los procesos naturales.',
    },
    activo: true,
  },
  {
    nombre: 'Lucía',
    apellido: 'Martínez',
    email: 'lucia.martinez@example.com',
    telefono: '+54 11 4567-8901',
    documento: '35.300.333',
    direccion: {
      calle: 'San Martín',
      numero: '950',
      ciudad: 'Córdoba',
      provincia: 'Córdoba',
      codigoPostal: '5000',
      pais: 'Argentina',
    },
    preferenciasOrganolepticas: {
      categoria: 'cervezas',
      perfilSabor: ['amargo', 'lupulado', 'cítrico'],
      intensidad: 'alta',
      alergiasRestricciones: ['sulfitos'],
      notasAdicionales: 'Le encantan las IPAs y las Pale Ales artesanales.',
    },
    activo: true,
  },
  {
    nombre: 'Sebastián',
    apellido: 'López',
    email: 'sebastian.lopez@example.com',
    telefono: '+54 261 567-8901',
    documento: '30.400.444',
    direccion: {
      calle: 'Belgrano',
      numero: '255',
      ciudad: 'Mendoza',
      provincia: 'Mendoza',
      codigoPostal: '5500',
      pais: 'Argentina',
    },
    preferenciasOrganolepticas: {
      categoria: 'vinos',
      perfilSabor: ['robusto', 'especiado', 'taninos firmes'],
      intensidad: 'alta',
      alergiasRestricciones: [],
      notasAdicionales: 'Sommelier aficionado, prefiere vinos de guarda con crianza en roble.',
    },
    activo: true,
  },
  {
    nombre: 'Camila',
    apellido: 'Torres',
    email: 'camila.torres@example.com',
    telefono: '+54 11 6789-0123',
    documento: '38.500.555',
    direccion: {
      calle: 'Arenales',
      numero: '1200',
      piso: '3',
      departamento: 'A',
      ciudad: 'Buenos Aires',
      provincia: 'CABA',
      codigoPostal: '1061',
      pais: 'Argentina',
    },
    preferenciasOrganolepticas: {
      categoria: 'cafes',
      perfilSabor: ['chocolate', 'nuez', 'cuerpo pleno'],
      intensidad: 'media-alta',
      alergiasRestricciones: [],
      notasAdicionales: 'Prefiere espressos y blends con tostado oscuro.',
    },
    activo: true,
  },
];

// ─── Función principal ────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  logger.info('=== ClubCurator — Iniciando carga de datos de prueba ===');

  // 1. Conectar usando el mismo factory que utiliza app.ts
  const database = DBEngineFactory.createDBEngine();
  const ds: DataSource = await database.connectDB();
  logger.info(`Conexión establecida (${ds.options.type})`);

  // 2. Verificar si ya existen datos para evitar duplicados
  const productosExistentes = await ds.getRepository(Producto).count();
  if (productosExistentes > 0) {
    logger.warn(
      `Ya existen ${productosExistentes} producto(s) en la base de datos. ` +
        'Abortando seed para evitar duplicados. Limpia la BD antes de volver a sembrar.',
    );
    await database.disconnectDB();
    return;
  }

  // ── 3. Productos ──────────────────────────────────────────────────────────
  logger.info('Insertando productos...');
  const productoRepo = ds.getRepository(Producto);
  const productosGuardados: Producto[] = [];

  for (const data of productosData) {
    const producto = productoRepo.create(data);
    productosGuardados.push(await productoRepo.save(producto));
  }
  logger.info(`  ✔ ${productosGuardados.length} productos creados.`);

  // Helpers de búsqueda por SKU para armar las composiciones
  const bySkuMap = new Map(productosGuardados.map((p) => [p.sku!, p]));
  const bySku = (sku: string): Producto => {
    const p = bySkuMap.get(sku);
    if (!p) throw new Error(`Producto con SKU '${sku}' no encontrado tras el seed.`);
    return p;
  };

  // ── 4. Cajas Mensuales ────────────────────────────────────────────────────
  logger.info('Insertando cajas mensuales con sus composiciones...');
  const cajaRepo = ds.getRepository(CajaMensual);
  const composicionRepo = ds.getRepository(CajaMensualProducto);
  const cajasGuardadas: CajaMensual[] = [];

  // Caja 1 — Vinos — Octubre 2026
  const cajaVinos = cajaRepo.create({
    nombre: 'Caja Gran Terroir — Otoño Mendocino',
    categoria: 'vinos',
    mes: 10,
    anio: 2026,
    descripcion:
      'Selección de tres vinos premium de Mendoza: un Malbec de guarda, un Gran Corte y un Torrontés refrescante para abrir la noche.',
    precioBase: 14500,
    disponible: true,
  });
  const cajaVinosSaved = await cajaRepo.save(cajaVinos);
  cajasGuardadas.push(cajaVinosSaved);

  await composicionRepo.save([
    composicionRepo.create({
      cajaMensualId: cajaVinosSaved.id,
      productoId: bySku('VIN-ZUC-MAL-001').id,
      cantidad: 2,
      orden: 1,
      precioAplicado: bySku('VIN-ZUC-MAL-001').precioReferencia,
    }),
    composicionRepo.create({
      cajaMensualId: cajaVinosSaved.id,
      productoId: bySku('VIN-CAT-CAB-001').id,
      cantidad: 1,
      orden: 2,
      precioAplicado: bySku('VIN-CAT-CAB-001').precioReferencia,
    }),
    composicionRepo.create({
      cajaMensualId: cajaVinosSaved.id,
      productoId: bySku('VIN-BAL-TOR-001').id,
      cantidad: 1,
      orden: 3,
      precioAplicado: bySku('VIN-BAL-TOR-001').precioReferencia,
    }),
  ]);

  // Caja 2 — Cafés — Octubre 2026
  const cajaCafes = cajaRepo.create({
    nombre: 'Caja Specialty Origins — Primera Cosecha',
    categoria: 'cafes',
    mes: 10,
    anio: 2026,
    descripcion:
      'Viaje por los mejores orígenes del mundo: desde la floral Geisha de Panamá hasta el robusto Espresso brasileño, más un blend signature.',
    precioBase: 6500,
    disponible: true,
  });
  const cajaCafesSaved = await cajaRepo.save(cajaCafes);
  cajasGuardadas.push(cajaCafesSaved);

  await composicionRepo.save([
    composicionRepo.create({
      cajaMensualId: cajaCafesSaved.id,
      productoId: bySku('CAF-ESM-GEI-001').id,
      cantidad: 1,
      orden: 1,
      precioAplicado: bySku('CAF-ESM-GEI-001').precioReferencia,
    }),
    composicionRepo.create({
      cajaMensualId: cajaCafesSaved.id,
      productoId: bySku('CAF-QUI-ETH-COL-001').id,
      cantidad: 1,
      orden: 2,
      precioAplicado: bySku('CAF-QUI-ETH-COL-001').precioReferencia,
    }),
    composicionRepo.create({
      cajaMensualId: cajaCafesSaved.id,
      productoId: bySku('CAF-SIN-ESP-001').id,
      cantidad: 2,
      orden: 3,
      precioAplicado: bySku('CAF-SIN-ESP-001').precioReferencia,
    }),
  ]);

  // Caja 3 — Cervezas — Octubre 2026
  const cajaCervezas = cajaRepo.create({
    nombre: 'Caja Craft Explorer — Estilos Clásicos',
    categoria: 'cervezas',
    mes: 10,
    anio: 2026,
    descripcion:
      'Tres estilos clásicos de la cerveza artesanal argentina: la explosiva IPA lupulada, la compleja Stout imperial y la refrescante Wheat Ale.',
    precioBase: 4800,
    disponible: true,
  });
  const cajaCervezasSaved = await cajaRepo.save(cajaCervezas);
  cajasGuardadas.push(cajaCervezasSaved);

  await composicionRepo.save([
    composicionRepo.create({
      cajaMensualId: cajaCervezasSaved.id,
      productoId: bySku('CER-ANT-IPA-001').id,
      cantidad: 2,
      orden: 1,
      precioAplicado: bySku('CER-ANT-IPA-001').precioReferencia,
    }),
    composicionRepo.create({
      cajaMensualId: cajaCervezasSaved.id,
      productoId: bySku('CER-PAT-STO-001').id,
      cantidad: 2,
      orden: 2,
      precioAplicado: bySku('CER-PAT-STO-001').precioReferencia,
    }),
    composicionRepo.create({
      cajaMensualId: cajaCervezasSaved.id,
      productoId: bySku('CER-KRA-WHE-001').id,
      cantidad: 2,
      orden: 3,
      precioAplicado: bySku('CER-KRA-WHE-001').precioReferencia,
    }),
  ]);

  logger.info(`  ✔ ${cajasGuardadas.length} cajas mensuales creadas con sus composiciones.`);

  // ── 5. Suscriptores ───────────────────────────────────────────────────────
  logger.info('Insertando suscriptores...');
  const suscriptorRepo = ds.getRepository(Suscriptor);
  const suscriptoresGuardados: Suscriptor[] = [];

  for (const data of suscriptoresData) {
    const suscriptor = suscriptorRepo.create(data);
    suscriptoresGuardados.push(await suscriptorRepo.save(suscriptor));
  }
  logger.info(`  ✔ ${suscriptoresGuardados.length} suscriptores creados.`);

  // ── 6. Suscripciones ──────────────────────────────────────────────────────
  logger.info('Insertando suscripciones...');
  const suscripcionRepo = ds.getRepository(Suscripcion);

  const suscripcionesData: Partial<Suscripcion>[] = [
    {
      suscriptorId: suscriptoresGuardados[0].id, // Valentina → vinos
      cajaMensualId: cajaVinosSaved.id,
      categoria: 'vinos',
      estado: 'activa',
      montoMensual: cajaVinosSaved.precioBase,
      fechaInicio: dateOffset(-30),
      proximoCobro: dateOffset(0),
    },
    {
      suscriptorId: suscriptoresGuardados[1].id, // Matías → cafés
      cajaMensualId: cajaCafesSaved.id,
      categoria: 'cafes',
      estado: 'activa',
      montoMensual: cajaCafesSaved.precioBase,
      fechaInicio: dateOffset(-60),
      proximoCobro: dateOffset(0),
    },
    {
      suscriptorId: suscriptoresGuardados[2].id, // Lucía → cervezas
      cajaMensualId: cajaCervezasSaved.id,
      categoria: 'cervezas',
      estado: 'activa',
      montoMensual: cajaCervezasSaved.precioBase,
      fechaInicio: dateOffset(-15),
      proximoCobro: dateOffset(15),
    },
    {
      suscriptorId: suscriptoresGuardados[3].id, // Sebastián → vinos (pausada)
      cajaMensualId: cajaVinosSaved.id,
      categoria: 'vinos',
      estado: 'pausada',
      montoMensual: cajaVinosSaved.precioBase,
      fechaInicio: dateOffset(-90),
      proximoCobro: dateOffset(30),
    },
    {
      suscriptorId: suscriptoresGuardados[4].id, // Camila → cafés
      cajaMensualId: cajaCafesSaved.id,
      categoria: 'cafes',
      estado: 'activa',
      montoMensual: cajaCafesSaved.precioBase,
      fechaInicio: dateOffset(-10),
      proximoCobro: dateOffset(20),
    },
  ];

  const suscripcionesGuardadas: Suscripcion[] = [];
  for (const data of suscripcionesData) {
    const suscripcion = suscripcionRepo.create(data);
    suscripcionesGuardadas.push(await suscripcionRepo.save(suscripcion));
  }
  logger.info(`  ✔ ${suscripcionesGuardadas.length} suscripciones creadas.`);

  // ── 7. Resumen final ──────────────────────────────────────────────────────
  logger.info('');
  logger.info('=== Seed completado exitosamente ===');
  logger.info(`  Productos:     ${productosGuardados.length}`);
  logger.info(`  Cajas:         ${cajasGuardadas.length}`);
  logger.info(`  Suscriptores:  ${suscriptoresGuardados.length}`);
  logger.info(`  Suscripciones: ${suscripcionesGuardadas.length}`);

  await database.disconnectDB();
}

// ─── Entry point ──────────────────────────────────────────────────────────────
seed().catch((err) => {
  logger.error('Error durante el seed:', err);
  process.exit(1);
});

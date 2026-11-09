import { z } from 'zod';

const categoriaSchema = z.enum(['vinos', 'cafes', 'cervezas']);
const estadoSchema = z.enum(['activa', 'pausada', 'cancelada']);

export const createSuscripcionSchema = z.object({
  suscriptorId: z.string().uuid('El suscriptorId debe ser un UUID válido'),
  cajaMensualId: z.string().uuid('El cajaMensualId debe ser un UUID válido'),
  categoria: categoriaSchema.optional(),
  estado: estadoSchema.optional(),
  montoMensual: z.coerce.number().positive('El monto mensual debe ser mayor a 0'),
  fechaInicio: z.string().optional(),
  proximoCobro: z.string().optional(),
});

export const updateSuscripcionSchema = createSuscripcionSchema.partial();

export const suscripcionIdParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

export const suscriptorIdParamSchema = z.object({
  suscriptorId: z.string().uuid('El suscriptorId debe ser un UUID válido'),
});

import { z } from 'zod';

const categoriaSchema = z.enum(['vinos', 'cafes', 'cervezas']);

export const composicionSchema = z.object({
  productoId: z.string().uuid('El productoId debe ser un UUID válido'),
  cantidad: z.coerce.number().int().positive('La cantidad debe ser un entero mayor a cero'),
  orden: z.coerce.number().int().optional(),
  precioAplicado: z.coerce.number().nonnegative().optional(),
});

export const createCajaMensualSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  categoria: categoriaSchema,
  mes: z.coerce.number().int().min(1, 'El mes debe estar entre 1 y 12').max(12, 'El mes debe estar entre 1 y 12'),
  anio: z.coerce.number().int().min(2000, 'El año debe ser mayor o igual a 2000'),
  descripcion: z.string().max(2000).optional(),
  precioBase: z.coerce.number().nonnegative('El precio base no puede ser negativo').optional(),
  disponible: z.boolean().optional(),
  composiciones: z.array(composicionSchema).optional(),
});

export const updateCajaMensualSchema = createCajaMensualSchema.partial();

export const recommendCajaMensualSchema = z.object({
  suscriptorId: z.string().uuid('El suscriptorId debe ser un UUID válido'),
  preferencias: z.record(z.string(), z.unknown()).optional(),
});

export const cajaMensualIdParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

export const periodoParamSchema = z.object({
  anio: z.coerce.number().int().min(2000),
  mes: z.coerce.number().int().min(1).max(12),
});

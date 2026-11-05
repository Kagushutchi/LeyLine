import { z } from 'zod';

export const createProductoSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  descripcion: z.string().max(2000).optional(),
  categoria: z.string().trim().min(1, 'La categoría es obligatoria').max(50),
  tipo: z.string().trim().min(1, 'El tipo es obligatorio').max(100),
  productor: z.string().trim().min(1, 'El productor es obligatorio').max(150),
  perfilNotas: z.array(z.string()).optional(),
  alergenosRestricciones: z.array(z.string()).optional(),
  sku: z.string().trim().max(100).optional(),
  precioReferencia: z.coerce.number().nonnegative('El precio de referencia no puede ser negativo').optional(),
  activo: z.boolean().optional(),
});

export const updateProductoSchema = createProductoSchema.partial();

export const productoIdParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

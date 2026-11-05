import { z } from 'zod';

const direccionSchema = z
  .object({
    calle: z.string().max(150).optional(),
    numero: z.string().max(50).optional(),
    piso: z.string().max(50).optional(),
    departamento: z.string().max(50).optional(),
    ciudad: z.string().max(100).optional(),
    provincia: z.string().max(100).optional(),
    codigoPostal: z.string().max(20).optional(),
    pais: z.string().max(100).optional(),
  })
  .passthrough();

const preferenciasSchema = z
  .object({
    categoria: z.enum(['vinos', 'cafes', 'cervezas']).optional(),
    perfilSabor: z.array(z.string()).optional(),
    intensidad: z.string().max(50).optional(),
    alergiasRestricciones: z.array(z.string()).optional(),
    notasAdicionales: z.string().max(1000).optional(),
  })
  .passthrough();

export const createSuscriptorSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  apellido: z.string().trim().max(150).optional(),
  email: z.string().trim().email('El email no tiene un formato válido').max(150),
  telefono: z.string().trim().max(50).optional(),
  documento: z.string().trim().max(50).optional(),
  direccion: direccionSchema.optional(),
  preferenciasOrganolepticas: preferenciasSchema.optional(),
  activo: z.boolean().optional(),
});

export const updateSuscriptorSchema = createSuscriptorSchema.partial();

export const suscriptorIdParamSchema = z.object({
  id: z.string().uuid('El ID debe ser un UUID válido'),
});

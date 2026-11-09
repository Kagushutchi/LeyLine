import { z } from 'zod';

export const registerAdminSchema = z.object({
  nombreNegocio: z.string().trim().min(1, 'El nombre del negocio es obligatorio').max(150),
  email: z.string().trim().email('El email no tiene un formato válido').max(150),
  username: z.string().trim().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(100),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255),
});

export const registerSubscriptorSchema = z.object({
  email: z.string().trim().email('El email no tiene un formato válido').max(150),
  username: z.string().trim().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(100),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(150),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(255),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).optional(),
  email: z.string().trim().optional(),
  username: z.string().trim().optional(),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'El refresh token es obligatorio'),
});

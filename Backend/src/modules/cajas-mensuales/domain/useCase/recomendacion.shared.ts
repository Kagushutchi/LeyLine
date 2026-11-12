import { AppError } from '../../../../common/errors/app-error';
import { envConfig } from '../../../../config/env.config';
import { Producto } from '../../../productos/infrastructure/producto.entity';
import { RecomendacionSugerida } from '../../client/deepseek-recommendation-client';

export interface ComposicionRecomendada {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  orden: number;
  precioAplicado: number;
}

export interface RecomendacionCajaMensual {
  nombre: string;
  categoria: string;
  mes: number;
  anio: number;
  descripcion?: string;
  precioBase: number;
  disponible: boolean;
  composiciones: ComposicionRecomendada[];
}

export function obtenerApiKey(): string {
  const clave = envConfig.deepseek.apiKey;
  if (!clave) {
    throw new AppError('Falta configurar DEEPSEEK_API_KEY en el entorno (.env)', 400);
  }
  return clave;
}

export function construirCatalogoResumido(catalogo: Producto[]) {
  return catalogo.map((producto) => ({
    productoId: producto.id,
    nombre: producto.nombre,
    tipo: producto.tipo,
    productor: producto.productor,
    notasDeCata: producto.perfilNotas || [],
    restricciones: producto.alergenosRestricciones || [],
    precioReferencia: Number(producto.precioReferencia) || 0,
  }));
}

export function armarRecomendacion(
  sugerencia: RecomendacionSugerida,
  catalogo: Producto[],
  categoria: string
): RecomendacionCajaMensual {
  const productosPorId = new Map(catalogo.map((producto) => [producto.id, producto]));
  const idsVistos = new Set<string>();
  const composiciones: ComposicionRecomendada[] = [];

  for (const item of sugerencia.composiciones || []) {
    const producto = productosPorId.get(item.productoId);
    if (!producto || idsVistos.has(item.productoId)) continue;
    idsVistos.add(item.productoId);
    const cantidad = Math.min(3, Math.max(1, Math.trunc(item.cantidad) || 1));
    composiciones.push({
      productoId: producto.id,
      productoNombre: producto.nombre,
      cantidad,
      orden: composiciones.length + 1,
      precioAplicado: Number(producto.precioReferencia) || 0,
    });
  }

  const precioBase = composiciones.reduce(
    (total, composicion) => total + composicion.precioAplicado * composicion.cantidad,
    0
  );

  const ahora = new Date();
  return {
    nombre: sugerencia.nombre || `Caja Curada Personalizada - ${categoria.toUpperCase()}`,
    categoria,
    mes: ahora.getMonth() + 1,
    anio: ahora.getFullYear(),
    descripcion: sugerencia.descripcion,
    precioBase,
    disponible: true,
    composiciones,
  };
}

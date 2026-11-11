import { getDataSource } from '../../../../config/database.config';
import { envConfig } from '../../../../config/env.config';
import { AppError } from '../../../../common/errors/app-error';
import { Suscriptor } from '../../../suscriptores/infrastructure/suscriptor.entity';
import { Producto } from '../../../productos/infrastructure/producto.entity';
import { IsNull } from 'typeorm';

export interface AdminBoxSuggestion {
  nombreSugerido: string;
  categoria: 'vinos' | 'cafes' | 'cervezas';
  precioSugerido: number;
  descripcion: string;
  justificacionComercial: string;
  porcentajeAudienciaAfin: number;
  modeloIA: string;
  composicionSugerida: Array<{
    productoId: string;
    nombreProducto: string;
    cantidad: number;
  }>;
}

/**
 * Caso de uso: SuggestCajaAdmin
 *
 * Permite al administrador de una bodega/tostadero obtener una sugerencia inteligente
 * de qué nueva caja mensual crear, analizando de forma agregada las preferencias
 * organolépticas de toda su base de suscriptores activos y los productos en inventario.
 */
export default class SuggestCajaAdmin {
  async execute(tenantId?: string): Promise<AdminBoxSuggestion> {
    const apiKey = envConfig.ai.googleApiKey;
    if (!apiKey) {
      throw new AppError(
        'El asesor comercial de IA no está configurado. Agregá GOOGLE_AI_API_KEY en el archivo .env del backend.',
        503,
      );
    }

    // 1. Obtener los suscriptores del tenant
    const suscriptores = await this.getSuscriptores(tenantId);
    if (suscriptores.length === 0) {
      throw new AppError(
        'Aún no tienes suscriptores registrados para que la IA pueda analizar patrones de demanda.',
        400,
      );
    }

    // 2. Obtener los productos disponibles del tenant
    const productos = await this.getProductos(tenantId);
    if (productos.length === 0) {
      throw new AppError(
        'No tienes productos cargados en tu catálogo para que la IA arme la composición de la caja.',
        400,
      );
    }

    // 3. Agregar y resumir patrones de preferencias
    const resumenClientes = this.analizarPreferenciaClientes(suscriptores);

    // 4. Armar el prompt para Gemini
    const prompt = this.buildPrompt(resumenClientes, productos);

    // 5. Consultar a Gemini
    const rawResponse = await this.callGemini(prompt, apiKey);

    // 6. Parsear respuesta JSON estructurada
    const parsed = this.parseGeminiResponse(rawResponse);

    // 7. Validar y asociar productos válidos
    const productoMap = new Map(productos.map(p => [p.id, p]));
    const composicionValida = (parsed.composicionSugerida ?? [])
      .filter((item: any) => productoMap.has(item.productoId))
      .map((item: any) => {
        const prod = productoMap.get(item.productoId)!;
        return {
          productoId: prod.id,
          nombreProducto: prod.nombre,
          cantidad: Math.max(1, Number(item.cantidad) || 1),
        };
      });

    // Si la IA devolvió IDs no coincidentes, fallback con los primeros productos disponibles
    if (composicionValida.length === 0 && productos.length > 0) {
      composicionValida.push({
        productoId: productos[0].id,
        nombreProducto: productos[0].nombre,
        cantidad: 2,
      });
    }

    return {
      nombreSugerido: parsed.nombreSugerido || 'Selección Exclusiva Recomendada',
      categoria: (parsed.categoria || productos[0].categoria || 'vinos') as any,
      precioSugerido: Number(parsed.precioSugerido) || 25000,
      descripcion: parsed.descripcion || 'Selección temática diseñada para tus suscriptores.',
      justificacionComercial: parsed.justificacionComercial || 'Diseñada en base al perfil de cata de tus suscriptores.',
      porcentajeAudienciaAfin: Math.min(100, Math.max(1, Number(parsed.porcentajeAudienciaAfin) || 80)),
      modeloIA: envConfig.ai.geminiModel,
      composicionSugerida: composicionValida,
    };
  }

  private async getSuscriptores(tenantId?: string): Promise<Suscriptor[]> {
    const repo = getDataSource().getRepository(Suscriptor);
    const where: any = { activo: true, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return repo.find({ where });
  }

  private async getProductos(tenantId?: string): Promise<Producto[]> {
    const repo = getDataSource().getRepository(Producto);
    const where: any = { activo: true, deletedAt: IsNull() };
    if (tenantId) where.tenantId = tenantId;
    return repo.find({ where });
  }

  private analizarPreferenciaClientes(suscriptores: Suscriptor[]) {
    const conteoSabores: Record<string, number> = {};
    const conteoIntensidad: Record<string, number> = {};
    const conteoCategorias: Record<string, number> = {};
    const alergias: Set<string> = new Set();

    for (const s of suscriptores) {
      const pref = s.preferenciasOrganolepticas;
      if (!pref) continue;

      if (pref.categoria) {
        conteoCategorias[pref.categoria] = (conteoCategorias[pref.categoria] || 0) + 1;
      }
      if (pref.intensidad) {
        conteoIntensidad[pref.intensidad] = (conteoIntensidad[pref.intensidad] || 0) + 1;
      }
      if (Array.isArray(pref.perfilSabor)) {
        for (const sabor of pref.perfilSabor) {
          conteoSabores[sabor] = (conteoSabores[sabor] || 0) + 1;
        }
      }
      if (Array.isArray(pref.alergiasRestricciones)) {
        for (const al of pref.alergiasRestricciones) {
          alergias.add(al);
        }
      }
    }

    return {
      totalClientesAnalizados: suscriptores.length,
      categoriasPreferidas: conteoCategorias,
      saboresFrecuentes: conteoSabores,
      intensidades: conteoIntensidad,
      alergiasComunes: Array.from(alergias),
    };
  }

  private buildPrompt(resumen: any, productos: Producto[]): string {
    const catalogoProductos = productos.map(p => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      tipo: p.tipo,
      precioReferencia: p.precioReferencia,
      perfilNotas: p.perfilNotas || [],
    }));

    return `Eres un director comercial, sommelier maestro y estratega de negocios de clubes de suscripción de lujo (vinos, café y cerveza artesanal).

Tu misión es asesorar al dueño de la bodega/productor recomendándole QUÉ NUEVA CAJA MENSUAL CREAR este mes, maximizando la afinidad con sus clientes actuales y utilizando su inventario real de productos.

## Datos de la masa de clientes actuales de la bodega:
${JSON.stringify(resumen, null, 2)}

## Catálogo de productos disponibles del productor:
${JSON.stringify(catalogoProductos, null, 2)}

## Instrucciones estratégicas:
1. Analizá los sabores, categorías e intensidades más solicitadas por la base de clientes.
2. Armá una selección equilibrada (2 a 4 botellas/unidades) usando los productos reales del catálogo suministrado.
3. Proponé un nombre comercial elegante y atractivo, un precio sugerido competitivo, y una descripción vendedora.
4. Explicá en la justificación comercial POR QUÉ esta caja tendrá éxito basándote en los datos de sus clientes.
5. Devolvé ÚNICAMENTE un objeto JSON con este formato exacto:

{
  "nombreSugerido": "<nombre de la caja>",
  "categoria": "vinos",
  "precioSugerido": <número>,
  "descripcion": "<descripción atractiva para el catálogo>",
  "justificacionComercial": "<explicación estratégica basada en las preferencias de su audiencia>",
  "porcentajeAudienciaAfin": <número 0-100>,
  "composicionSugerida": [
    {
      "productoId": "<id exacto del producto del catálogo>",
      "nombreProducto": "<nombre del producto>",
      "cantidad": <cantidad recomendada, ej: 1 o 2>
    }
  ]
}`;
  }

  private async callGemini(prompt: string, apiKey: string): Promise<string> {
    const model = envConfig.ai.geminiModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json',
      },
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err: any) {
      throw new AppError(`Error de red al contactar la API de Gemini: ${err.message}`, 503);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new AppError(
        `La API de Gemini respondió con error ${response.status}: ${errorBody.slice(0, 200)}`,
        502,
      );
    }

    const data = await response.json() as any;
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new AppError('La API de Gemini devolvió una respuesta vacía', 502);
    }

    return text;
  }

  private parseGeminiResponse(raw: string): any {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      throw new AppError(
        `Error al parsear sugerencia comercial de IA: ${cleaned.slice(0, 300)}`,
        502,
      );
    }
  }
}


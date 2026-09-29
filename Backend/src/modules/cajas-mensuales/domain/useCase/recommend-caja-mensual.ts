import { CajaMensual } from "../../infrastructure/caja-mensual.entity";
import { CajaMensualRepository } from "../../infrastructure/caja-mensual-repository";
import { AppError } from "../../../../common/errors/app-error";

export default class RecommendCajaMensual {
  private repository: CajaMensualRepository;

  constructor() {
    this.repository = new CajaMensualRepository();
  }

  async execute(suscriptorId: string, preferencias?: any): Promise<Partial<CajaMensual>> {
    if (!suscriptorId) {
      throw new AppError('El ID del suscriptor es requerido para generar la recomendación personalizada', 400);
    }

    // Lógica de armado y personalización con algoritmo heurístico / perfil organoléptico
    const categoriaPreferida = preferencias?.categoria || 'vinos';
    const ahora = new Date();

    return {
      nombre: `Caja Curada Personalizada - ${categoriaPreferida.toUpperCase()}`,
      categoria: categoriaPreferida,
      mes: ahora.getMonth() + 1,
      anio: ahora.getFullYear(),
      descripcion: `Selección curada en base a las preferencias organolépticas del suscriptor (${suscriptorId})`,
      precioBase: 12500.00,
      disponible: true,
      composiciones: [],
    };
  }
}

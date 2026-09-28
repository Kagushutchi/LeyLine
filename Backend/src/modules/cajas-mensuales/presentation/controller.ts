import CreateCajaMensual from '../domain/useCase/create-caja-mensual';
import GetCajasMensuales from '../domain/useCase/get-cajas-mensuales';
import { GetCajaMensualById } from '../domain/useCase/get-caja-mensual-by-id';
import { GetCajasByMesAnio } from '../domain/useCase/get-cajas-by-mes-anio';
import RecommendCajaMensual from '../domain/useCase/recommend-caja-mensual';
import UpdateCajaMensual from '../domain/useCase/update-caja-mensual';
import DeleteCajaMensual from '../domain/useCase/delete-caja-mensual';

export default class CajasMensualesController {
  async getCajasMensuales(): Promise<any[]> {
    const useCase = new GetCajasMensuales();
    return await useCase.execute();
  }

  async getCajaMensualById(id: string | number): Promise<any> {
    const useCase = new GetCajaMensualById();
    return await useCase.execute(id);
  }

  async getCajasByMesAnio(mes: number, anio: number): Promise<any[]> {
    const useCase = new GetCajasByMesAnio();
    return await useCase.execute(mes, anio);
  }

  async createCajaMensual(payload: any): Promise<any> {
    const useCase = new CreateCajaMensual();
    return await useCase.execute(payload);
  }

  async recommendCajaMensual(suscriptorId: string, preferencias?: any): Promise<any> {
    const useCase = new RecommendCajaMensual();
    return await useCase.execute(suscriptorId, preferencias);
  }

  async updateCajaMensual(id: string | number, payload: any): Promise<any> {
    const useCase = new UpdateCajaMensual();
    return await useCase.execute(id, payload);
  }

  async deleteCajaMensual(id: string | number): Promise<any> {
    const useCase = new DeleteCajaMensual();
    return await useCase.execute(id);
  }
}

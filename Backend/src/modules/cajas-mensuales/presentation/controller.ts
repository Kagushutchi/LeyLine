import CreateCajaMensual from '../domain/useCase/create-caja-mensual';
import GetCajasMensuales from '../domain/useCase/get-cajas-mensuales';
import { GetCajaMensualById } from '../domain/useCase/get-caja-mensual-by-id';
import { GetCajasByMesAnio } from '../domain/useCase/get-cajas-by-mes-anio';
import RecommendCajaMensual from '../domain/useCase/recommend-caja-mensual';
import RecommendCajaMensualGeneral from '../domain/useCase/recommend-caja-mensual-general';
import RecommendCajasExistentes from '../domain/useCase/recommend-cajas-existentes';
import UpdateCajaMensual from '../domain/useCase/update-caja-mensual';
import DeleteCajaMensual from '../domain/useCase/delete-caja-mensual';

export default class CajasMensualesController {
  async getCajasMensuales(tenantId?: string): Promise<any[]> {
    const useCase = new GetCajasMensuales();
    return await useCase.execute(tenantId);
  }

  async getCajaMensualById(id: string | number, tenantId?: string): Promise<any> {
    const useCase = new GetCajaMensualById();
    return await useCase.execute(id, tenantId);
  }

  async getCajasByMesAnio(mes: number, anio: number): Promise<any[]> {
    const useCase = new GetCajasByMesAnio();
    return await useCase.execute(mes, anio);
  }

  async createCajaMensual(payload: any, tenantId?: string): Promise<any> {
    const useCase = new CreateCajaMensual();
    return await useCase.execute(payload, tenantId);
  }

  async recommendCajaMensual(suscriptorId: string, preferencias?: any, apiKey?: string): Promise<any> {
    const useCase = new RecommendCajaMensual();
    return await useCase.execute(suscriptorId, preferencias, apiKey);
  }

  async recommendCajaMensualGeneral(tenantId?: string, apiKey?: string): Promise<any> {
    const useCase = new RecommendCajaMensualGeneral();
    return await useCase.execute(tenantId, apiKey);
  }

  async recommendCajasExistentes(suscriptorId: string, apiKey?: string): Promise<any> {
    const useCase = new RecommendCajasExistentes();
    return await useCase.execute(suscriptorId, apiKey);
  }

  async updateCajaMensual(id: string | number, payload: any, tenantId?: string): Promise<any> {
    const useCase = new UpdateCajaMensual();
    return await useCase.execute(id, payload, tenantId);
  }

  async deleteCajaMensual(id: string | number, tenantId?: string): Promise<any> {
    const useCase = new DeleteCajaMensual();
    return await useCase.execute(id, tenantId);
  }
}

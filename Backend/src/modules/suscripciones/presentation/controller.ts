import CreateSuscripcion from '../domain/useCase/create-suscripcion';
import GetSuscripciones from '../domain/useCase/get-suscripciones';
import { GetSuscripcionById } from '../domain/useCase/get-suscripcion-by-id';
import { GetSuscripcionesBySuscriptor } from '../domain/useCase/get-suscripciones-by-suscriptor';
import UpdateSuscripcion from '../domain/useCase/update-suscripcion';
import PauseSuscripcion from '../domain/useCase/pause-suscripcion';
import CancelSuscripcion from '../domain/useCase/cancel-suscripcion';
import DeleteSuscripcion from '../domain/useCase/delete-suscripcion';

export default class SuscripcionesController {
  async getSuscripciones(tenantId?: string, suscriptorId?: string): Promise<any[]> {
    const useCase = new GetSuscripciones();
    return await useCase.execute(tenantId, suscriptorId);
  }

  async getSuscripcionById(id: string | number, tenantId?: string): Promise<any> {
    const useCase = new GetSuscripcionById();
    const suscripcion = await useCase.execute(id);
    if (suscripcion && tenantId && suscripcion.tenantId && suscripcion.tenantId !== tenantId) {
      return null;
    }
    return suscripcion;
  }

  async getSuscripcionesBySuscriptor(suscriptorId: string): Promise<any[]> {
    const useCase = new GetSuscripcionesBySuscriptor();
    return await useCase.execute(suscriptorId);
  }

  async createSuscripcion(payload: any, tenantId?: string): Promise<any> {
    const useCase = new CreateSuscripcion();
    return await useCase.execute(payload, tenantId);
  }

  async updateSuscripcion(id: string | number, payload: any, tenantId?: string): Promise<any> {
    const useCase = new UpdateSuscripcion();
    return await useCase.execute(id, payload, tenantId);
  }

  async pauseSuscripcion(id: string | number, tenantId?: string): Promise<any> {
    const useCase = new PauseSuscripcion();
    return await useCase.execute(id, tenantId);
  }

  async cancelSuscripcion(id: string | number, tenantId?: string): Promise<any> {
    const useCase = new CancelSuscripcion();
    return await useCase.execute(id, tenantId);
  }

  async deleteSuscripcion(id: string | number, tenantId?: string): Promise<any> {
    const useCase = new DeleteSuscripcion();
    return await useCase.execute(id, tenantId);
  }
}

import GetSuscriptores from "../domain/useCase/get-suscriptores";
import CreateSuscriptor from "../domain/useCase/create-suscriptores";
import UpdateSuscriptor from "../domain/useCase/update-suscriptor";
import { GetSuscriptorById } from "../domain/useCase/get-suscriptor-by-id";
import DeleteSuscriptor from "../domain/useCase/delete-suscriptor";

export default class SuscriptoresController
{
    async getSuscriptores(): Promise<any[]>
    {
        const useCase = new GetSuscriptores();
        return await useCase.execute();
    }

    async getSuscriptorById(id: string | number): Promise<any>
    {
        const useCase = new GetSuscriptorById();
        return await useCase.execute(id);
    }

    async createSuscriptor(payload: any): Promise<any>
    {
        const useCase = new CreateSuscriptor();
        return await useCase.execute(payload);
    }  

    async updateSuscriptor(id: string | number, payload: any): Promise<any>
    {
        const useCase = new UpdateSuscriptor();
        return await useCase.execute(id, payload);
    }

    async deleteSuscriptor(id: string | number): Promise<any>
    {
        const useCase = new DeleteSuscriptor();
        return await useCase.execute(id);
    }
}
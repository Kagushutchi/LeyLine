import axios from 'axios';
import * as soap from 'soap';
import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/utils/logger';
import { envConfig } from '../../../config/env.config';
import { inventarioWsdl } from '../soap/inventario.wsdl';

export interface InventarioDTO {
  productoId: string;
  productor: string;
  cantidadDisponible: number;
  cantidadReservada: number;
  actualizadoEn: string;
}

interface ConsultarInventarioResponse {
  inventario: InventarioDTO;
}

export class InventarioSoapClient {
  private static clientPromise: Promise<soap.Client> | null = null;

  private getClient(): Promise<soap.Client> {
    if (!InventarioSoapClient.clientPromise) {
      const httpClient = axios.create({ timeout: envConfig.soap.timeoutMs });
      InventarioSoapClient.clientPromise = soap.createClientAsync(inventarioWsdl, {
        endpoint: envConfig.soap.inventarioUrl,
        request: httpClient,
      });
    }

    return InventarioSoapClient.clientPromise;
  }

  async consultarInventario(productoId: string): Promise<InventarioDTO> {
    try {
      const client = await this.getClient();
      const [response] = (await client.consultarInventarioAsync({
        productoId,
      })) as [ConsultarInventarioResponse];

      return response.inventario;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error al consultar inventario SOAP para ${productoId}: ${message}`);
      throw new AppError('No se pudo consultar el inventario del productor', 503);
    }
  }
}

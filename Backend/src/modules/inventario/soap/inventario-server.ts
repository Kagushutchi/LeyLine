import { Application } from 'express';
import * as soap from 'soap';
import { logger } from '../../../common/utils/logger';
import { inventarioWsdl } from './inventario.wsdl';
import { inventarioService } from './inventario-service';

export const INVENTARIO_SOAP_PATH = '/soap/inventario';

export const setupInventarioSoap = (app: Application): void => {
  soap.listen(app, INVENTARIO_SOAP_PATH, inventarioService, inventarioWsdl, (error) => {
    if (error) {
      logger.error('No se pudo inicializar el servicio SOAP de inventario', error);
      return;
    }
    logger.info(`Servicio SOAP de inventario disponible en ${INVENTARIO_SOAP_PATH}?wsdl`);
  });
};

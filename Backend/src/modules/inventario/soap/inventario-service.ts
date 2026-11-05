import { AppError } from '../../../common/errors/app-error';
import { logger } from '../../../common/utils/logger';
import ConsultarInventario from '../domain/useCase/consultar-inventario';
import ReservarStock from '../domain/useCase/reservar-stock';
import ActualizarInventario from '../domain/useCase/actualizar-inventario';
import { StockProducto } from '../infrastructure/stock-producto.entity';

interface ConsultarInventarioArgs {
  productoId: string;
}

interface ReservarStockArgs {
  productoId: string;
  cantidad: number;
}

interface ActualizarInventarioArgs {
  productoId: string;
  cantidadDisponible: number;
}

const toInventario = (stock: StockProducto) => ({
  productoId: stock.productoId,
  productor: stock.productor,
  cantidadDisponible: stock.cantidadDisponible,
  cantidadReservada: stock.cantidadReservada,
  actualizadoEn: stock.actualizadoEn.toISOString(),
});

const fail = (operation: string, error: unknown): never => {
  if (error instanceof AppError) {
    throw new Error(`${operation}: ${error.message}`);
  }

  logger.error(`Error inesperado en la operación SOAP ${operation}`, error);
  throw new Error(`${operation}: error interno del servicio de inventario`);
};

export const inventarioService = {
  InventarioService: {
    InventarioPort: {
      consultarInventario: async (args: ConsultarInventarioArgs) => {
        try {
          const stock = await new ConsultarInventario().execute(args.productoId);
          return { inventario: toInventario(stock) };
        } catch (error) {
          return fail('consultarInventario', error);
        }
      },

      reservarStock: async (args: ReservarStockArgs) => {
        try {
          const reserva = await new ReservarStock().execute(args.productoId, Number(args.cantidad));
          return { reserva };
        } catch (error) {
          return fail('reservarStock', error);
        }
      },

      actualizarInventario: async (args: ActualizarInventarioArgs) => {
        try {
          const stock = await new ActualizarInventario().execute(
            args.productoId,
            Number(args.cantidadDisponible)
          );
          return { inventario: toInventario(stock) };
        } catch (error) {
          return fail('actualizarInventario', error);
        }
      },
    },
  },
};

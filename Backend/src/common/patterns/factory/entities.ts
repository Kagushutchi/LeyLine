import { Suscriptor } from "../../../modules/suscriptores/infrastructure/suscriptor.entity";
import { Suscripcion } from "../../../modules/suscripciones/infrastructure/suscripcion.entity";
import { CajaMensual } from "../../../modules/cajas-mensuales/infrastructure/caja-mensual.entity";
import { CajaMensualProducto } from "../../../modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity";
import { Producto } from "../../../modules/productos/infrastructure/producto.entity";

export const entities = [
    Suscriptor,
    Suscripcion,
    CajaMensual,
    CajaMensualProducto,
    Producto
];

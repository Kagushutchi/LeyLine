import { Suscriptor } from "../../../modules/suscriptores/infrastructure/suscriptor.entity";
import { Suscripcion } from "../../../modules/suscripciones/infrastructure/suscripcion.entity";
import { CajaMensual } from "../../../modules/cajas-mensuales/infrastructure/caja-mensual.entity";
import { CajaMensualProducto } from "../../../modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity";
import { Producto } from "../../../modules/productos/infrastructure/producto.entity";
import { StockProducto } from "../../../modules/inventario/infrastructure/stock-producto.entity";
import { Tenant } from "../../../modules/auth/infrastructure/tenant.entity";
import { User } from "../../../modules/auth/infrastructure/user.entity";

export const entities = [
    Suscriptor,
    Suscripcion,
    CajaMensual,
    CajaMensualProducto,
    Producto,
    StockProducto,
    Tenant,
    User
];

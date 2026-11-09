import { Suscriptor } from "../../../modules/suscriptores/infrastructure/suscriptor.entity";
import { Suscripcion } from "../../../modules/suscripciones/infrastructure/suscripcion.entity";
import { CajaMensual } from "../../../modules/cajas-mensuales/infrastructure/caja-mensual.entity";
import { CajaMensualProducto } from "../../../modules/cajas-mensuales/infrastructure/caja-mensual-producto.entity";
import { Producto } from "../../../modules/productos/infrastructure/producto.entity";
import { Tenant } from "../../../modules/auth/infrastructure/tenant.entity";
import { User } from "../../../modules/auth/infrastructure/user.entity";
import { SolicitudSuscripcion } from "../../../modules/solicitudes-suscripcion/infrastructure/solicitud.entity";
import { MensajeOutbox } from "../../../modules/solicitudes-suscripcion/infrastructure/outbox.entity";
import { MensajeInbox } from "../../../modules/solicitudes-suscripcion/infrastructure/inbox.entity";

export const entities = [
    Tenant,
    User,
    Suscriptor,
    Suscripcion,
    CajaMensual,
    CajaMensualProducto,
    Producto,
    SolicitudSuscripcion,
    MensajeOutbox,
    MensajeInbox
];

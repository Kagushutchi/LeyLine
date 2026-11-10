import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

/**
 * Pagos recurrentes vía proveedor (Strategy): referencias al proveedor en solicitudes y suscripciones,
 * cache de planes y outbox con más de un mensaje por solicitud (eventos de pago).
 * Es tolerante a esquemas ya sincronizados (hasColumn/hasTable).
 */
export class AddPaymentProvider1800000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TABLE directo: addColumn() de TypeORM reconstruye la tabla en SQLite y pierde índices ajenos a la migración.
    const additions: [string, string, string][] = [
      ['solicitudes_suscripcion', 'paymentProvider', 'varchar(30)'],
      ['solicitudes_suscripcion', 'providerSessionId', 'varchar(100)'],
      ['solicitudes_suscripcion', 'checkoutUrl', 'text'],
      ['solicitudes_suscripcion', 'chargeAmountCents', 'int'],
      ['solicitudes_suscripcion', 'chargeCurrency', 'varchar(10)'],
      ['solicitudes_suscripcion', 'fxRate', 'varchar(32)'],
      ['suscripciones', 'paymentProvider', 'varchar(30)'],
      ['suscripciones', 'providerSubscriptionId', 'varchar(100)'],
      ['suscripciones', 'pausadaPorPago', 'boolean NOT NULL DEFAULT false'],
    ];
    for (const [table, name, type] of additions) {
      if (!(await queryRunner.hasColumn(table, name))) await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "${name}" ${type}`);
    }

    if (!(await queryRunner.hasTable('planes_pago'))) {
      const dateType = queryRunner.connection.options.type === 'postgres' ? 'timestamp' : 'datetime';
      await queryRunner.createTable(new Table({ name: 'planes_pago', columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'provider', type: 'varchar', length: '30' },
        { name: 'cajaMensualId', type: 'varchar', length: '100' },
        { name: 'amountCents', type: 'int' },
        { name: 'currency', type: 'varchar', length: '10' },
        { name: 'providerPlanId', type: 'varchar', length: '100' },
        { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
      ] }));
      await queryRunner.createIndex('planes_pago', new TableIndex({
        name: 'uq_plan_pago', columnNames: ['provider', 'cajaMensualId', 'amountCents', 'currency'], isUnique: true,
      }));
    }

    if (!(await queryRunner.hasTable('clientes_pago'))) {
      const dateType = queryRunner.connection.options.type === 'postgres' ? 'timestamp' : 'datetime';
      await queryRunner.createTable(new Table({ name: 'clientes_pago', columns: [
        { name: 'id', type: 'varchar', length: '36', isPrimary: true },
        { name: 'provider', type: 'varchar', length: '30' },
        { name: 'suscriptorId', type: 'varchar', length: '100' },
        { name: 'providerCustomerId', type: 'varchar', length: '100' },
        { name: 'createdAt', type: dateType, default: 'CURRENT_TIMESTAMP' },
      ] }));
      await queryRunner.createIndex('clientes_pago', new TableIndex({ name: 'uq_cliente_pago', columnNames: ['provider', 'suscriptorId'], isUnique: true }));
    }

    // Un único `subscription.requested` por solicitud; los `payment.event` pueden repetirse.
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_outbox_solicitud"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_outbox_solicitud" ON "mensajes_outbox" ("solicitudId") WHERE "tipo" = 'subscription.requested'`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const rows: unknown[] = await queryRunner.query(`SELECT 1 FROM "mensajes_outbox" WHERE "tipo" <> 'subscription.requested' LIMIT 1`);
    if (rows.length) throw new Error('Cannot roll back payment provider support while payment events exist');
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_outbox_solicitud"`);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_outbox_solicitud" ON "mensajes_outbox" ("solicitudId")`);
    if (await queryRunner.hasTable('planes_pago')) await queryRunner.dropTable('planes_pago');
    if (await queryRunner.hasTable('clientes_pago')) await queryRunner.dropTable('clientes_pago');
    // Las columnas nullable de proveedor se conservan: quitarlas en SQLite reconstruye las tablas y no aporta seguridad.
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableIndex } from 'typeorm';

export class AddSubscriptionRequests1797000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const dateType = queryRunner.connection.options.type === 'postgres' ? 'timestamp' : 'datetime';
    const time = { type: dateType, default: 'CURRENT_TIMESTAMP' };
    const text = (length: string, isNullable = false) => ({ type: 'varchar', length, isNullable });
    await queryRunner.createTable(new Table({ name: 'solicitudes_suscripcion', columns: [
      { name: 'id', ...text('36'), isPrimary: true },
      { name: 'tenantId', ...text('100') }, { name: 'principalId', ...text('100') },
      { name: 'suscriptorId', ...text('100') }, { name: 'cajaMensualId', ...text('100') },
      { name: 'idempotencyKey', ...text('128') }, { name: 'payloadHash', ...text('64') },
      { name: 'precioConfirmado', type: 'decimal', precision: 10, scale: 2 },
      { name: 'intentosProcesamiento', type: 'int', default: 0 },
      { name: 'estado', ...text('20'), default: "'pendiente'" },
      { name: 'suscripcionId', ...text('100', true) },
      { name: 'createdAt', ...time }, { name: 'updatedAt', ...time },
    ] }));
    await queryRunner.createIndex('solicitudes_suscripcion', new TableIndex({ name: 'uq_solicitud_idempotencia', columnNames: ['principalId', 'idempotencyKey'], isUnique: true }));
    await queryRunner.createTable(new Table({ name: 'mensajes_outbox', columns: [
      { name: 'id', ...text('36'), isPrimary: true }, { name: 'solicitudId', ...text('36') },
      { name: 'tipo', ...text('100') }, { name: 'version', type: 'int' }, { name: 'contenido', type: 'text' },
      { name: 'estado', ...text('20'), default: "'pendiente'" }, { name: 'intentos', type: 'int', default: 0 },
      { name: 'nextAttemptAt', type: 'bigint', isNullable: true }, { name: 'claimToken', ...text('36', true) },
      { name: 'claimUntil', type: 'bigint', isNullable: true }, { name: 'publishedAt', type: 'bigint', isNullable: true }, { name: 'createdAt', ...time },
    ] }));
    await queryRunner.createIndex('mensajes_outbox', new TableIndex({ name: 'uq_outbox_solicitud', columnNames: ['solicitudId'], isUnique: true }));
    await queryRunner.createTable(new Table({ name: 'mensajes_inbox', columns: [
      { name: 'id', ...text('36'), isPrimary: true }, { name: 'consumer', ...text('100') },
      { name: 'messageId', ...text('36') }, { name: 'createdAt', ...time },
    ] }));
    await queryRunner.createIndex('mensajes_inbox', new TableIndex({ name: 'uq_inbox_consumidor_mensaje', columnNames: ['consumer', 'messageId'], isUnique: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['solicitudes_suscripcion', 'mensajes_outbox', 'mensajes_inbox']) {
      const rows: unknown[] = await queryRunner.query(`SELECT 1 FROM "${table}" LIMIT 1`);
      if (rows.length) throw new Error('Cannot roll back subscription requests while records exist');
    }
    await queryRunner.dropTable('mensajes_inbox');
    await queryRunner.dropTable('mensajes_outbox');
    await queryRunner.dropTable('solicitudes_suscripcion');
  }
}

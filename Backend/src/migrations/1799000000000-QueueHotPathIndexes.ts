import { MigrationInterface, QueryRunner } from 'typeorm';

/** Keeps the relay's polling query and the duplicate check fast as history grows. */
export class QueueHotPathIndexes1799000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_outbox_pendiente" ON "mensajes_outbox" ("createdAt") WHERE "estado" = 'pendiente'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_solicitud_suscriptor_caja" ON "solicitudes_suscripcion" ("suscriptorId", "cajaMensualId")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_solicitud_suscriptor_caja"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_outbox_pendiente"`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

/** One live (activa/pausada) subscription per subscriber and box. Fails loudly if data already violates it. */
export class UniqueLiveSubscription1798000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates: unknown[] = await queryRunner.query(
      `SELECT "suscriptorId", "cajaMensualId" FROM "suscripciones"
       WHERE "estado" IN ('activa','pausada') AND "deletedAt" IS NULL
       GROUP BY "suscriptorId", "cajaMensualId" HAVING COUNT(*) > 1`);
    if (duplicates.length) {
      throw new Error(`Cannot add uniqueness: ${duplicates.length} subscriber/box pairs have duplicate live subscriptions; resolve them first`);
    }
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_suscripcion_viva" ON "suscripciones" ("suscriptorId", "cajaMensualId")
       WHERE "estado" IN ('activa','pausada') AND "deletedAt" IS NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "uq_suscripcion_viva"`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddSoftDelete1794000000000 implements MigrationInterface {
  private readonly tables = [
    'suscriptores', 'productos', 'suscripciones', 'cajas_mensuales', 'cajas_mensuales_productos',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const type = isPostgres ? 'timestamp' : 'datetime';
    for (const table of this.tables) {
      if (!(await queryRunner.hasColumn(table, 'deletedAt'))) {
        if (!isPostgres) {
          await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "deletedAt" ${type}`);
        } else {
          await queryRunner.addColumn(table, new TableColumn({ name: 'deletedAt', type, isNullable: true }));
        }
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Columns may predate this migration, and dropping them would destroy deletion history.
    // Rollback leaves the nullable columns in place intentionally.
  }
}

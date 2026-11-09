import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

/**
 * `tenants` and `users` were created by AddAuthAndMultiTenancy1794100000000 without
 * `deletedAt`, but their entities are soft-deletable. Adds the column when missing.
 */
export class AddSoftDeleteToAuthTables1799100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const type = queryRunner.connection.options.type === 'postgres' ? 'timestamp' : 'datetime';
    for (const table of ['tenants', 'users']) {
      if ((await queryRunner.hasTable(table)) && !(await queryRunner.hasColumn(table, 'deletedAt'))) {
        await queryRunner.addColumn(table, new TableColumn({ name: 'deletedAt', type, isNullable: true }));
      }
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Dropping the column would destroy deletion history; left in place intentionally.
  }
}

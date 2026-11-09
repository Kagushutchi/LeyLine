import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn, TableForeignKey, TableUnique } from 'typeorm';

export class LinkUsersToSuscriptores1796000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.getTable('users');
    const subscribers = await queryRunner.getTable('suscriptores');
    const subscriberId = subscribers?.findColumnByName('id');
    if (!users || !subscriberId) {
      throw new Error('users and suscriptores must exist before linking accounts');
    }
    if (users.findColumnByName('suscriptorId')) {
      throw new Error('users.suscriptorId already exists; verify the schema before migrating');
    }

    await queryRunner.addColumn('users', new TableColumn({
      name: 'suscriptorId',
      type: subscriberId.type,
      length: subscriberId.length,
      isNullable: true,
    }));
    await queryRunner.createUniqueConstraint('users', new TableUnique({
      name: 'UQ_users_suscriptorId',
      columnNames: ['suscriptorId'],
    }));
    await queryRunner.createForeignKey('users', new TableForeignKey({
      name: 'FK_users_suscriptorId',
      columnNames: ['suscriptorId'],
      referencedTableName: 'suscriptores',
      referencedColumnNames: ['id'],
      onDelete: 'SET NULL',
    }));
    // Existing accounts deliberately remain unlinked; email is not proof of ownership.
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const users = await queryRunner.getTable('users');
    if (!users) throw new Error('users table is missing');
    const foreignKey = users.foreignKeys.find((key) => key.name === 'FK_users_suscriptorId');
    const unique = users.uniques.find((constraint) => constraint.name === 'UQ_users_suscriptorId');
    if (!foreignKey || !unique || !users.findColumnByName('suscriptorId')) {
      throw new Error('identity link schema is incomplete; refusing rollback');
    }
    // Dropping this column destroys established identity links. Never migrate down with links in use.
    const linked = await queryRunner.query('SELECT 1 FROM "users" WHERE "suscriptorId" IS NOT NULL LIMIT 1');
    if (linked.length) throw new Error('Cannot roll back identity links while accounts are linked');
    await queryRunner.dropForeignKey('users', foreignKey);
    await queryRunner.dropUniqueConstraint('users', unique);
    await queryRunner.dropColumn('users', 'suscriptorId');
  }
}

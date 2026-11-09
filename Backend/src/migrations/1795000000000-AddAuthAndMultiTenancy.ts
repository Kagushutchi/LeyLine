import { MigrationInterface, QueryRunner } from 'typeorm';
import bcrypt from 'bcryptjs';

export class AddAuthAndMultiTenancy1795000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    const dateType = isPostgres ? 'timestamp' : 'datetime';
    const nowFunc = isPostgres ? 'NOW()' : "datetime('now')";
    const boolType = isPostgres ? 'boolean' : 'boolean';
    const textType = 'text';

    // 1. Crear tabla tenants si no existe
    if (!(await queryRunner.hasTable('tenants'))) {
      await queryRunner.query(`
        CREATE TABLE "tenants" (
          "id" varchar PRIMARY KEY NOT NULL,
          "nombre" varchar(150) NOT NULL,
          "slug" varchar(100) NOT NULL UNIQUE,
          "plan" varchar(50) NOT NULL DEFAULT 'artesanal',
          "activo" ${boolType} NOT NULL DEFAULT (1),
          "createdAt" ${dateType} NOT NULL DEFAULT (${nowFunc}),
          "updatedAt" ${dateType} NOT NULL DEFAULT (${nowFunc}),
          "deletedAt" ${dateType} NULL
        )
      `);
    }

    // 2. Crear tabla users si no existe
    if (!(await queryRunner.hasTable('users'))) {
      await queryRunner.query(`
        CREATE TABLE "users" (
          "id" varchar PRIMARY KEY NOT NULL,
          "username" varchar(100) NOT NULL UNIQUE,
          "email" varchar(150) NOT NULL UNIQUE,
          "password" varchar(255) NOT NULL,
          "role" varchar(20) NOT NULL DEFAULT 'subscriptor',
          "nombre" varchar(150) NULL,
          "apellido" varchar(150) NULL,
          "tenantId" varchar NULL,
          "refreshToken" ${textType} NULL,
          "activo" ${boolType} NOT NULL DEFAULT (1),
          "createdAt" ${dateType} NOT NULL DEFAULT (${nowFunc}),
          "updatedAt" ${dateType} NOT NULL DEFAULT (${nowFunc}),
          "deletedAt" ${dateType} NULL,
          FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL
        )
      `);
    }

    // 3. Añadir tenantId a entidades de dominio
    const domainTables = ['productos', 'cajas_mensuales', 'suscripciones', 'suscriptores'];
    for (const table of domainTables) {
      if (await queryRunner.hasTable(table)) {
        const hasTenantCol = await queryRunner.hasColumn(table, 'tenantId');
        if (!hasTenantCol) {
          await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "tenantId" varchar NULL`);
        }
      }
    }

    // 4. Sembrar Tenant por defecto y asignar a registros existentes
    const defaultTenantId = 'tenant-bodega-raices-001';
    const existingTenants: any[] = await queryRunner.query(
      `SELECT "id" FROM "tenants" WHERE "id" = '${defaultTenantId}' OR "slug" = 'bodega-raices-de-cuyo'`
    );

    if (existingTenants.length === 0) {
      await queryRunner.query(`
        INSERT INTO "tenants" ("id", "nombre", "slug", "plan", "activo")
        VALUES ('${defaultTenantId}', 'Bodega Raíces de Cuyo', 'bodega-raices-de-cuyo', 'premium', 1)
      `);
    }

    // Actualizar registros existentes para asociarlos a la bodega por defecto
    for (const table of domainTables) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.query(
          `UPDATE "${table}" SET "tenantId" = '${defaultTenantId}' WHERE "tenantId" IS NULL`
        );
      }
    }

    // 5. Sembrar usuarios iniciales demo (Admin e Subscriptor) si no existen
    const defaultPasswordHash = await bcrypt.hash('password123', 10);

    const adminUser: any[] = await queryRunner.query(
      `SELECT "id" FROM "users" WHERE "email" = 'admin@bodegaraices.com' OR "username" = 'admin'`
    );
    if (adminUser.length === 0) {
      await queryRunner.query(`
        INSERT INTO "users" ("id", "username", "email", "password", "role", "nombre", "tenantId", "activo")
        VALUES ('usr-admin-001', 'admin', 'admin@bodegaraices.com', '${defaultPasswordHash}', 'admin', 'Administrador Bodega', '${defaultTenantId}', 1)
      `);
    }

    const subUser: any[] = await queryRunner.query(
      `SELECT "id" FROM "users" WHERE "email" = 'valentina.rossi@example.com' OR "username" = 'valentina'`
    );
    if (subUser.length === 0) {
      await queryRunner.query(`
        INSERT INTO "users" ("id", "username", "email", "password", "role", "nombre", "apellido", "activo")
        VALUES ('usr-sub-001', 'valentina', 'valentina.rossi@example.com', '${defaultPasswordHash}', 'subscriptor', 'Valentina', 'Rossi', 1)
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Mantener idempotencia y preservar datos
  }
}


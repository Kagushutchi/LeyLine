import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Agrega autenticación (tenants, users) y el campo tenantId de multi-tenancy
 * a productos, suscriptores, suscripciones y cajas_mensuales.
 *
 * Nota: estas tablas ya existían antes de esta migración (InitialSchema /
 * AddStockProductos), por eso acá sólo se agrega la columna nueva en vez de
 * recrear la tabla completa.
 */
export class AddAuthAndMultiTenancy1794100000000 implements MigrationInterface {
    name = 'AddAuthAndMultiTenancy1794100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "slug" character varying(100) NOT NULL, "plan" character varying(50) NOT NULL DEFAULT 'artesanal', "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug"), CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "username" character varying(100) NOT NULL, "email" character varying(150) NOT NULL, "password" character varying(255) NOT NULL, "role" character varying(20) NOT NULL DEFAULT 'subscriptor', "nombre" character varying(150), "apellido" character varying(150), "tenantId" uuid, "refreshToken" text, "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_users_username" UNIQUE ("username"), CONSTRAINT "UQ_users_email" UNIQUE ("email"), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);

        await queryRunner.query(`ALTER TABLE "productos" ADD "tenantId" uuid`);
        await queryRunner.query(`ALTER TABLE "suscriptores" ADD "tenantId" uuid`);
        await queryRunner.query(`ALTER TABLE "suscripciones" ADD "tenantId" uuid`);
        await queryRunner.query(`ALTER TABLE "cajas_mensuales" ADD "tenantId" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cajas_mensuales" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "suscripciones" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "suscriptores" DROP COLUMN "tenantId"`);
        await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN "tenantId"`);

        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_users_tenantId"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
    }

}

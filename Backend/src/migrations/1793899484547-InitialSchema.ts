import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1793899484547 implements MigrationInterface {
    name = 'InitialSchema1793899484547'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "suscriptores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "apellido" character varying(150), "email" character varying(150) NOT NULL, "telefono" character varying(50), "documento" character varying(50), "direccion" text, "preferenciasOrganolepticas" text, "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e4419fce4cd4aec1ec6b2291a27" UNIQUE ("email"), CONSTRAINT "PK_194fda413f202b90b0afa3c7cc0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "productos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "descripcion" text, "categoria" character varying(50) NOT NULL, "tipo" character varying(100) NOT NULL, "productor" character varying(150) NOT NULL, "perfilNotas" text, "alergenosRestricciones" text, "sku" character varying(100), "precioReferencia" numeric(10,2), "activo" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_805687bf24c1411756fbd37b2f3" UNIQUE ("sku"), CONSTRAINT "PK_04f604609a0949a7f3b43400766" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cajas_mensuales_productos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cajaMensualId" uuid NOT NULL, "productoId" uuid NOT NULL, "cantidad" integer NOT NULL, "orden" integer, "precioAplicado" numeric(10,2), CONSTRAINT "PK_3a4eb73cfc5358d6cd80257cfd6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cajas_mensuales" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(150) NOT NULL, "categoria" character varying(50) NOT NULL, "mes" integer NOT NULL, "anio" integer NOT NULL, "descripcion" text, "precioBase" numeric(10,2) NOT NULL, "disponible" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7540fff1f983c12930288e8af8a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "suscripciones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "suscriptorId" uuid NOT NULL, "cajaMensualId" uuid NOT NULL, "categoria" character varying(50) NOT NULL, "estado" character varying(20) NOT NULL DEFAULT 'activa', "montoMensual" numeric(10,2) NOT NULL, "fechaInicio" date, "proximoCobro" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_bdaed0a0504c9786d45b786a68a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "cajas_mensuales_productos" ADD CONSTRAINT "FK_419b860210bd97402ab5f2e7db2" FOREIGN KEY ("cajaMensualId") REFERENCES "cajas_mensuales"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cajas_mensuales_productos" ADD CONSTRAINT "FK_685ed92b3dfe7a1d1223e6a275b" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "suscripciones" ADD CONSTRAINT "FK_b96987990387a70edd59ca337f5" FOREIGN KEY ("suscriptorId") REFERENCES "suscriptores"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "suscripciones" ADD CONSTRAINT "FK_93eabd72960787768f57191e621" FOREIGN KEY ("cajaMensualId") REFERENCES "cajas_mensuales"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "suscripciones" DROP CONSTRAINT "FK_93eabd72960787768f57191e621"`);
        await queryRunner.query(`ALTER TABLE "suscripciones" DROP CONSTRAINT "FK_b96987990387a70edd59ca337f5"`);
        await queryRunner.query(`ALTER TABLE "cajas_mensuales_productos" DROP CONSTRAINT "FK_685ed92b3dfe7a1d1223e6a275b"`);
        await queryRunner.query(`ALTER TABLE "cajas_mensuales_productos" DROP CONSTRAINT "FK_419b860210bd97402ab5f2e7db2"`);
        await queryRunner.query(`DROP TABLE "suscripciones"`);
        await queryRunner.query(`DROP TABLE "cajas_mensuales"`);
        await queryRunner.query(`DROP TABLE "cajas_mensuales_productos"`);
        await queryRunner.query(`DROP TABLE "productos"`);
        await queryRunner.query(`DROP TABLE "suscriptores"`);
    }

}

import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddStockProductos1793901499529 implements MigrationInterface {
    name = 'AddStockProductos1793901499529'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "stock_productos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productoId" uuid NOT NULL, "productor" character varying(150) NOT NULL, "cantidadDisponible" integer NOT NULL DEFAULT '0', "cantidadReservada" integer NOT NULL DEFAULT '0', "actualizadoEn" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_983b0bc91cbee4608576d0f50b5" UNIQUE ("productoId"), CONSTRAINT "PK_066c8a2f421dc8bdebbc78d7a18" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "stock_productos" ADD CONSTRAINT "FK_983b0bc91cbee4608576d0f50b5" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "stock_productos" DROP CONSTRAINT "FK_983b0bc91cbee4608576d0f50b5"`);
        await queryRunner.query(`DROP TABLE "stock_productos"`);
    }

}

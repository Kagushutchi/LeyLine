import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('mensajes_inbox')
@Index('uq_inbox_consumidor_mensaje', ['consumer', 'messageId'], { unique: true })
export class MensajeInbox {
  @PrimaryColumn({ type: 'varchar', length: 36 }) id: string;
  @Column({ type: 'varchar', length: 100 }) consumer: string;
  @Column({ type: 'varchar', length: 36 }) messageId: string;
  @CreateDateColumn() createdAt: Date;
}

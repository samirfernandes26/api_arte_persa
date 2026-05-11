import { Module } from '@nestjs/common';
import { FilasModule } from '../filas/filas.module';
import { FaturasController } from './faturas.controller';
import { FaturasService } from './faturas.service';

@Module({
  imports: [FilasModule],
  controllers: [FaturasController],
  providers: [FaturasService],
  exports: [FaturasService],
})
export class FaturasModule {}

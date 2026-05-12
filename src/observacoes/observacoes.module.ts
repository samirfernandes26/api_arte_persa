import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { ObservacoesController } from './observacoes.controller';
import { ObservacoesService } from './observacoes.service';

@Module({
  imports: [UploadsModule],
  controllers: [ObservacoesController],
  providers: [ObservacoesService],
  exports: [ObservacoesService],
})
export class ObservacoesModule {}

import { Module } from '@nestjs/common';
import { UploadsModule } from '../uploads/uploads.module';
import { ItensController } from './itens.controller';
import { ItensService } from './itens.service';

@Module({
  imports: [UploadsModule],
  controllers: [ItensController],
  providers: [ItensService],
  exports: [ItensService],
})
export class ItensModule {}

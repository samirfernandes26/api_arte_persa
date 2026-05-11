import { Module } from '@nestjs/common';
import { ClientesModule } from '../clientes/clientes.module';
import { FilasModule } from '../filas/filas.module';
import { OrdensServicoController } from './ordens-servico.controller';
import { OrdensServicoService } from './ordens-servico.service';

@Module({
  imports: [ClientesModule, FilasModule],
  controllers: [OrdensServicoController],
  providers: [OrdensServicoService],
  exports: [OrdensServicoService],
})
export class OrdensServicoModule {}

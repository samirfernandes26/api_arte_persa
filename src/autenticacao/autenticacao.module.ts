import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AutenticacaoController } from './autenticacao.controller';
import { AutenticacaoService } from './autenticacao.service';

@Module({
  imports: [UsuariosModule],
  controllers: [AutenticacaoController],
  providers: [AutenticacaoService],
  exports: [AutenticacaoService],
})
export class AutenticacaoModule {}

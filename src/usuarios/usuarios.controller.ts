import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Publico } from '../comum/decoradores/publico.decorator';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Publico()
  @Post('primeiro-master')
  criarPrimeiroMaster(@Body() dto: CriarUsuarioDto) {
    return this.usuariosService.criarPrimeiroMaster(dto);
  }

  @Perfis(PerfilUsuario.MASTER)
  @Post()
  criar(
    @Body() dto: CriarUsuarioDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.usuariosService.criar(dto, usuarioAtual.sub);
  }

  @Perfis(PerfilUsuario.MASTER, PerfilUsuario.SUPERVISOR)
  @Get()
  listar() {
    return this.usuariosService.listar();
  }

  @Perfis(PerfilUsuario.MASTER, PerfilUsuario.SUPERVISOR)
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.usuariosService.buscarPorId(id);
  }

  @Perfis(PerfilUsuario.MASTER)
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarUsuarioDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.usuariosService.atualizar(id, dto, usuarioAtual.sub);
  }
}

import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Publico } from '../comum/decoradores/publico.decorator';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import {
  serializarDto,
  serializarListaDto,
} from '../comum/utilitarios/serializacao.util';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';
import {
  UsuarioResponseDto,
  UsuarioResumidoDto,
} from './dto/usuario-response.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Publico()
  @Post('primeiro-master')
  async criarPrimeiroMaster(@Body() dto: CriarUsuarioDto) {
    return serializarDto(
      UsuarioResponseDto,
      await this.usuariosService.criarPrimeiroMaster(dto),
    );
  }

  @Perfis(PerfilUsuario.MASTER)
  @Post()
  async criar(
    @Body() dto: CriarUsuarioDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      UsuarioResponseDto,
      await this.usuariosService.criar(dto, usuarioAtual.sub),
    );
  }

  @Perfis(PerfilUsuario.MASTER, PerfilUsuario.SUPERVISOR)
  @Get()
  async listar() {
    return serializarListaDto(UsuarioResumidoDto, await this.usuariosService.listar());
  }

  @Perfis(PerfilUsuario.MASTER, PerfilUsuario.SUPERVISOR)
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return serializarDto(UsuarioResponseDto, await this.usuariosService.buscarPorId(id));
  }

  @Perfis(PerfilUsuario.MASTER)
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarUsuarioDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      UsuarioResponseDto,
      await this.usuariosService.atualizar(id, dto, usuarioAtual.sub),
    );
  }
}

import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import {
  serializarDto,
  serializarListaDto,
} from '../comum/utilitarios/serializacao.util';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
import { ClienteResponseDto } from './dto/cliente-response.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post()
  async criar(
    @Body() dto: CriarClienteDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      ClienteResponseDto,
      await this.clientesService.criar(dto, usuarioAtual.sub),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  async listar(@Query() consulta: PaginacaoConsultaDto) {
    return serializarListaDto(
      ClienteResponseDto,
      await this.clientesService.listar(consulta),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return serializarDto(ClienteResponseDto, await this.clientesService.buscarPorId(id));
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id')
  async atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarClienteDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      ClienteResponseDto,
      await this.clientesService.atualizar(id, dto, usuarioAtual.sub),
    );
  }
}

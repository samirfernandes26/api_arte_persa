import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';
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
  criar(
    @Body() dto: CriarClienteDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.clientesService.criar(dto, usuarioAtual.sub);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  listar(@Query() consulta: PaginacaoConsultaDto) {
    return this.clientesService.listar(consulta);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.clientesService.buscarPorId(id);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarClienteDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.clientesService.atualizar(id, dto, usuarioAtual.sub);
  }
}

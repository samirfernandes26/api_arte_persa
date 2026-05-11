import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { ServicosService } from './servicos.service';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Post()
  criar(@Body() dto: CriarServicoDto, @UsuarioAtual() usuarioAtual: PayloadToken) {
    return this.servicosService.criar(dto, usuarioAtual.sub);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  listar(@Query() consulta: PaginacaoConsultaDto) {
    return this.servicosService.listar(consulta);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.servicosService.buscarPorId(id);
  }

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.servicosService.atualizar(id, dto, usuarioAtual.sub);
  }
}

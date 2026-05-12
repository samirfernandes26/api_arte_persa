import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { serializarDto, serializarListaDto } from '../comum/utilitarios/serializacao.util';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { ServicoResponseDto, ServicoResumoResponseDto } from './dto/servico-response.dto';
import { ServicosService } from './servicos.service';

@Controller('servicos')
export class ServicosController {
  constructor(private readonly servicosService: ServicosService) {}

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Post()
  async criar(@Body() dto: CriarServicoDto, @UsuarioAtual() usuarioAtual: PayloadAutenticacao) {
    return serializarDto(
      ServicoResponseDto,
      await this.servicosService.criar(dto, usuarioAtual.sub),
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
      ServicoResumoResponseDto,
      await this.servicosService.listar(consulta),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  async buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return serializarDto(
      ServicoResponseDto,
      await this.servicosService.buscarPorId(id),
    );
  }

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Patch(':id')
  async atualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AtualizarServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      ServicoResponseDto,
      await this.servicosService.atualizar(id, dto, usuarioAtual.sub),
    );
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { AtualizarOrdemServicoDto } from './dto/atualizar-ordem-servico.dto';
import { AtualizarStatusOrdemServicoDto } from './dto/atualizar-status-ordem-servico.dto';
import { ConsultarOrdensServicoDto } from './dto/consultar-ordens-servico.dto';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import { OrdensServicoService } from './ordens-servico.service';

@Controller('ordens-servico')
export class OrdensServicoController {
  constructor(private readonly ordensServicoService: OrdensServicoService) {}

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post()
  criar(
    @Body() dto: CriarOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.ordensServicoService.criar(dto, usuarioAtual);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  listar(@Query() consulta: ConsultarOrdensServicoDto) {
    return this.ordensServicoService.listar(consulta);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.ordensServicoService.buscarPorId(id);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.ordensServicoService.atualizar(id, dto, usuarioAtual);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id/status')
  atualizarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.ordensServicoService.atualizarStatus(id, dto, usuarioAtual);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post(':id/gerar-pdf')
  solicitarGeracaoPdf(@Param('id') id: string) {
    return this.ordensServicoService.solicitarGeracaoPdf(id);
  }
}

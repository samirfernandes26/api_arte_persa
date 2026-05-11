import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { AdicionarObservacaoDto } from './dto/adicionar-observacao.dto';
import { ObservacoesService } from './observacoes.service';

@Controller('observacoes')
export class ObservacoesController {
  constructor(private readonly observacoesService: ObservacoesService) {}

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post()
  adicionar(
    @Body() dto: AdicionarObservacaoDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.observacoesService.adicionar(dto, usuarioAtual);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('ordens-servico/:ordemServicoId')
  listarPorOrdemServico(@Param('ordemServicoId') ordemServicoId: string) {
    return this.observacoesService.listarPorOrdemServico(ordemServicoId);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('itens/:itemId')
  listarPorItem(@Param('itemId') itemId: string) {
    return this.observacoesService.listarPorItem(itemId);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('clientes/:clienteId')
  listarPorCliente(@Param('clienteId') clienteId: string) {
    return this.observacoesService.listarPorCliente(clienteId);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('faturas/:faturaId')
  listarPorFatura(@Param('faturaId') faturaId: string) {
    return this.observacoesService.listarPorFatura(faturaId);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.observacoesService.buscarPorId(id);
  }
}

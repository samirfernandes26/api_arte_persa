import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { serializarDto, serializarListaDto } from '../comum/utilitarios/serializacao.util';
import { AdicionarObservacaoDto } from './dto/adicionar-observacao.dto';
import { ObservacaoResponseDto } from './dto/observacao-response.dto';
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
  async adicionar(
    @Body() dto: AdicionarObservacaoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      ObservacaoResponseDto,
      await this.observacoesService.adicionar(dto, usuarioAtual),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('ordens-servico/:ordemServicoId')
  async listarPorOrdemServico(@Param('ordemServicoId') ordemServicoId: string) {
    return serializarListaDto(
      ObservacaoResponseDto,
      await this.observacoesService.listarPorOrdemServico(ordemServicoId),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('itens/:itemId')
  async listarPorItem(@Param('itemId') itemId: string) {
    return serializarListaDto(
      ObservacaoResponseDto,
      await this.observacoesService.listarPorItem(itemId),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('clientes/:clienteId')
  async listarPorCliente(@Param('clienteId') clienteId: string) {
    return serializarListaDto(
      ObservacaoResponseDto,
      await this.observacoesService.listarPorCliente(clienteId),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('faturas/:faturaId')
  async listarPorFatura(@Param('faturaId') faturaId: string) {
    return serializarListaDto(
      ObservacaoResponseDto,
      await this.observacoesService.listarPorFatura(faturaId),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return serializarDto(
      ObservacaoResponseDto,
      await this.observacoesService.buscarPorId(id),
    );
  }
}

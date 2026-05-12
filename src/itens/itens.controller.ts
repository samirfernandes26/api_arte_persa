import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { serializarDto, serializarListaDto } from '../comum/utilitarios/serializacao.util';
import { AtualizarItemOrdemServicoDto } from './dto/atualizar-item-ordem-servico.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { ItensService } from './itens.service';

@Controller('itens')
export class ItensController {
  constructor(private readonly itensService: ItensService) {}

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get('ordem-servico/:ordemServicoId')
  async listarPorOrdemServico(@Param('ordemServicoId') ordemServicoId: string) {
    return serializarListaDto(
      ItemResponseDto,
      await this.itensService.listarPorOrdemServico(ordemServicoId),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return serializarDto(ItemResponseDto, await this.itensService.buscarPorId(id));
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarItemOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      ItemResponseDto,
      await this.itensService.atualizar(id, dto, usuarioAtual.sub),
    );
  }
}

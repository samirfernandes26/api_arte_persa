import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { AtualizarItemOrdemServicoDto } from './dto/atualizar-item-ordem-servico.dto';
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
  listarPorOrdemServico(@Param('ordemServicoId') ordemServicoId: string) {
    return this.itensService.listarPorOrdemServico(ordemServicoId);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.itensService.buscarPorId(id);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarItemOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.itensService.atualizar(id, dto, usuarioAtual.sub);
  }
}

import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { AtualizarStatusFaturaDto } from './dto/atualizar-status-fatura.dto';
import { ConsultarFaturasDto } from './dto/consultar-faturas.dto';
import { CriarFaturaDto } from './dto/criar-fatura.dto';
import { FaturasService } from './faturas.service';

@Controller('faturas')
export class FaturasController {
  constructor(private readonly faturasService: FaturasService) {}

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Post()
  criar(
    @Body() dto: CriarFaturaDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.faturasService.criar(dto, usuarioAtual);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  listar(@Query() consulta: ConsultarFaturasDto) {
    return this.faturasService.listar(consulta);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.faturasService.buscarPorId(id);
  }

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Patch(':id/status')
  atualizarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusFaturaDto,
    @UsuarioAtual() usuarioAtual: PayloadToken,
  ) {
    return this.faturasService.atualizarStatus(id, dto, usuarioAtual);
  }
}

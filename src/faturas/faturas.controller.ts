import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import {
  serializarDto,
  serializarListaDto,
} from '../comum/utilitarios/serializacao.util';
import { AtualizarStatusFaturaDto } from './dto/atualizar-status-fatura.dto';
import { ConsultarFaturasDto } from './dto/consultar-faturas.dto';
import { CriarFaturaDto } from './dto/criar-fatura.dto';
import { FaturaResponseDto } from './dto/fatura-response.dto';
import { FaturasService } from './faturas.service';

@Controller('faturas')
export class FaturasController {
  constructor(private readonly faturasService: FaturasService) {}

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Post()
  async criar(
    @Body() dto: CriarFaturaDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      FaturaResponseDto,
      await this.faturasService.criar(dto, usuarioAtual),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  async listar(@Query() consulta: ConsultarFaturasDto) {
    return serializarListaDto(
      FaturaResponseDto,
      await this.faturasService.listar(consulta),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return serializarDto(FaturaResponseDto, await this.faturasService.buscarPorId(id));
  }

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Patch(':id/status')
  async atualizarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusFaturaDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      FaturaResponseDto,
      await this.faturasService.atualizarStatus(id, dto, usuarioAtual),
    );
  }
}

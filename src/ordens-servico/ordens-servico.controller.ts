import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import {
  serializarDto,
  serializarListaDto,
} from '../comum/utilitarios/serializacao.util';
import { AtualizarOrdemServicoDto } from './dto/atualizar-ordem-servico.dto';
import { AtualizarStatusOrdemServicoDto } from './dto/atualizar-status-ordem-servico.dto';
import { ConsultarOrdensServicoDto } from './dto/consultar-ordens-servico.dto';
import { CriarOrdemServicoDto } from './dto/criar-ordem-servico.dto';
import {
  OrdemServicoResponseDto,
  OrdemServicoResumoResponseDto,
} from './dto/ordem-servico-response.dto';
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
  async criar(
    @Body() dto: CriarOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      OrdemServicoResponseDto,
      await this.ordensServicoService.criar(dto, usuarioAtual),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Get()
  async listar(@Query() consulta: ConsultarOrdensServicoDto) {
    return serializarListaDto(
      OrdemServicoResumoResponseDto,
      await this.ordensServicoService.listar(consulta),
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
      OrdemServicoResponseDto,
      await this.ordensServicoService.buscarPorId(id),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      OrdemServicoResponseDto,
      await this.ordensServicoService.atualizar(id, dto, usuarioAtual),
    );
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Patch(':id/status')
  async atualizarStatus(
    @Param('id') id: string,
    @Body() dto: AtualizarStatusOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return serializarDto(
      OrdemServicoResponseDto,
      await this.ordensServicoService.atualizarStatus(id, dto, usuarioAtual),
    );
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

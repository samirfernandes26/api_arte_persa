import { Body, Controller, Get, Post } from '@nestjs/common';
import { PerfilUsuario } from '../comum/enums/perfil-usuario.enum';
import { Perfis } from '../comum/decoradores/perfis.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import {
  ConfirmarArquivoClienteDto,
  ConfirmarAssinaturaOrdemServicoDto,
  ConfirmarImagemOrdemServicoDto,
} from './dto/confirmar-upload.dto';
import { GerarUrlPreAssinadaDto } from './dto/gerar-url-pre-assinada.dto';
import { ServicoUploads } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: ServicoUploads) {}

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post('url-pre-assinada')
  gerarUrlPreAssinada(
    @Body() dto: GerarUrlPreAssinadaDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return this.uploadsService.gerarUrlPreAssinada(dto, usuarioAtual.sub);
  }

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Post('confirmacoes/imagem-ordem')
  confirmarImagemOrdem(
    @Body() dto: ConfirmarImagemOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return this.uploadsService.confirmarImagemAdicionalOrdem(dto, usuarioAtual.sub);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post('confirmacoes/arquivo-cliente')
  confirmarArquivoCliente(
    @Body() dto: ConfirmarArquivoClienteDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return this.uploadsService.confirmarArquivoCliente(dto, usuarioAtual.sub);
  }

  @Perfis(
    PerfilUsuario.FUNCIONARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.MASTER,
  )
  @Post('confirmacoes/assinatura-ordem')
  confirmarAssinaturaOrdem(
    @Body() dto: ConfirmarAssinaturaOrdemServicoDto,
    @UsuarioAtual() usuarioAtual: PayloadAutenticacao,
  ) {
    return this.uploadsService.confirmarAssinaturaOrdem(dto, usuarioAtual.sub);
  }

  @Perfis(PerfilUsuario.SUPERVISOR, PerfilUsuario.MASTER)
  @Get('cors-s3')
  obterExemploCorsS3() {
    return this.uploadsService.obterExemploCorsBucket();
  }
}

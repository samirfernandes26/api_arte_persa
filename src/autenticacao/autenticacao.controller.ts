import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Publico } from '../comum/decoradores/publico.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { RequisicaoAutenticada } from '../comum/interfaces/requisicao-autenticada.interface';
import { EntrarDto } from './dto/login.dto';
import { TokenAtualizacaoDto } from './dto/refresh-token.dto';
import { AutenticacaoService } from './autenticacao.service';

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly autenticacaoService: AutenticacaoService) {}

  @Publico()
  @Post('entrar')
  entrar(@Body() dto: EntrarDto, @Req() requisicao: RequisicaoAutenticada) {
    return this.autenticacaoService.entrar(dto, {
      ip: requisicao.ip,
      agenteUsuario: requisicao.headers['user-agent'],
    });
  }

  @Publico()
  @Post('renovar-token')
  renovarToken(
    @Body() dto: TokenAtualizacaoDto,
    @Req() requisicao: RequisicaoAutenticada,
  ) {
    return this.autenticacaoService.renovarToken(dto, {
      ip: requisicao.ip,
      agenteUsuario: requisicao.headers['user-agent'],
    });
  }

  @Publico()
  @Post('sair')
  sair(@Body() dto: TokenAtualizacaoDto) {
    return this.autenticacaoService.sair(dto);
  }

  @Get('eu')
  eu(@UsuarioAtual() usuarioAtual: PayloadAutenticacao) {
    return this.autenticacaoService.obterUsuarioAutenticado(usuarioAtual.sub);
  }
}

import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Publico } from '../comum/decoradores/publico.decorator';
import { UsuarioAtual } from '../comum/decoradores/usuario-atual.decorator';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { RequisicaoAutenticada } from '../comum/interfaces/requisicao-autenticada.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AutenticacaoService } from './autenticacao.service';

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly autenticacaoService: AutenticacaoService) {}

  @Publico()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() requisicao: RequisicaoAutenticada) {
    return this.autenticacaoService.login(dto, {
      ip: requisicao.ip,
      userAgent: requisicao.headers['user-agent'],
    });
  }

  @Publico()
  @Post('refresh')
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() requisicao: RequisicaoAutenticada,
  ) {
    return this.autenticacaoService.refresh(dto, {
      ip: requisicao.ip,
      userAgent: requisicao.headers['user-agent'],
    });
  }

  @Publico()
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.autenticacaoService.logout(dto);
  }

  @Get('eu')
  eu(@UsuarioAtual() usuarioAtual: PayloadToken) {
    return this.autenticacaoService.obterUsuarioAutenticado(usuarioAtual.sub);
  }
}

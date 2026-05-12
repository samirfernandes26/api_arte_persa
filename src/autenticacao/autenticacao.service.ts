import {
  ForbiddenException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import ms from 'ms';
import { StringValue } from 'ms';
import { PerfilUsuario, TokenRefresh, Usuario } from '.prisma/client';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { serializarDto } from '../comum/utilitarios/serializacao.util';
import { ServicoPrisma } from '../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { UsuarioResponseDto } from '../usuarios/dto/usuario-response.dto';
import { EntrarDto } from './dto/login.dto';
import { TokenAtualizacaoDto } from './dto/refresh-token.dto';
import { RespostaAutenticacaoDto } from './dto/resposta-autenticacao.dto';

@Injectable()
export class AutenticacaoService {
  constructor(
    private readonly prisma: ServicoPrisma,
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async entrar(
    dto: EntrarDto,
    contexto: { ip?: string; agenteUsuario?: string },
  ) {
    const usuario = await this.usuariosService.buscarPorEmail(dto.email);

    if (!usuario || !usuario.ativo || usuario.data_exclusao) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const senhaValida = await compare(dto.senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const familiaToken = randomUUID();
    const emissao = await this.gerarParTokens(usuario, familiaToken, contexto);

    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimo_login_em: new Date() },
    });

    return emissao;
  }

  async sair(dto: TokenAtualizacaoDto): Promise<{ mensagem: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<PayloadAutenticacao>(
        dto.token_atualizacao,
        {
          secret: this.configService.getOrThrow<string>('JWT_SEGREDO_REFRESH'),
          issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
          audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
        },
      );

      if (payload.token_atualizacao_id) {
        await this.revogarTokenAtualizacao(payload.token_atualizacao_id);
      }
    } catch {
      return { mensagem: 'Saida concluida.' };
    }

    return { mensagem: 'Saida concluida.' };
  }

  async obterUsuarioAutenticado(usuarioId: string) {
    const usuario = await this.usuariosService.buscarPorId(usuarioId);
    return serializarDto(UsuarioResponseDto, usuario);
  }

  async renovarToken(
    dto: TokenAtualizacaoDto,
    contexto: { ip?: string; agenteUsuario?: string },
  ) {
    let payload: PayloadAutenticacao;
    try {
      payload = await this.jwtService.verifyAsync<PayloadAutenticacao>(dto.token_atualizacao, {
        secret: this.configService.getOrThrow<string>('JWT_SEGREDO_REFRESH'),
        issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
        audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
      });
    } catch {
      throw new UnauthorizedException('Token de atualizacao invalido ou expirado.');
    }

    if (payload.tipo !== 'refresh' || !payload.token_atualizacao_id) {
      throw new UnauthorizedException(
        'Token informado nao e um token de atualizacao.',
      );
    }

    const tokenPersistido = await this.prisma.tokenRefresh.findUnique({
      where: { id: payload.token_atualizacao_id },
      include: { usuario: true },
    });

    if (!tokenPersistido || !tokenPersistido.ativo || tokenPersistido.revogado_em) {
      throw new UnauthorizedException('Token de atualizacao revogado ou inexistente.');
    }

    if (tokenPersistido.expira_em.getTime() <= Date.now()) {
      throw new UnauthorizedException('Token de atualizacao expirado.');
    }

    const hashConfere = await compare(
      dto.token_atualizacao,
      tokenPersistido.hash_token,
    );
    if (!hashConfere) {
      throw new UnauthorizedException('Token de atualizacao invalido.');
    }

    if (!tokenPersistido.usuario.ativo || tokenPersistido.usuario.data_exclusao) {
      throw new ForbiddenException('Usuario inativo.');
    }

    await this.revogarTokenAtualizacao(tokenPersistido.id);

    return this.gerarParTokens(
      tokenPersistido.usuario,
      payload.familia_token ?? tokenPersistido.familia_token ?? randomUUID(),
      contexto,
    );
  }

  private async gerarParTokens(
    usuario: Usuario,
    familiaToken: string,
    contexto: { ip?: string; agenteUsuario?: string },
  ) {
    const tokenAtualizacaoPersistido = await this.criarTokenAtualizacaoPersistido(
      usuario.id,
      familiaToken,
      contexto,
    );

    const payloadAcesso: PayloadAutenticacao = {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil as PerfilUsuario,
      tipo: 'acesso',
    };

    const payloadRefresh: PayloadAutenticacao = {
      ...payloadAcesso,
      tipo: 'refresh',
      familia_token: familiaToken,
      token_atualizacao_id: tokenAtualizacaoPersistido.id,
    };

    const tokenAcesso = await this.jwtService.signAsync(payloadAcesso, {
      secret: this.configService.getOrThrow<string>('JWT_SEGREDO_ACESSO'),
      expiresIn: this.configService.get<string>(
        'JWT_TEMPO_ACESSO',
        '15m',
      ) as StringValue,
      issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
      audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
    });

    const tokenAtualizacao = await this.jwtService.signAsync(payloadRefresh, {
      secret: this.configService.getOrThrow<string>('JWT_SEGREDO_REFRESH'),
      expiresIn: this.configService.get<string>(
        'JWT_TEMPO_REFRESH',
        '30d',
      ) as StringValue,
      issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
      audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
    });

    await this.atualizarHashTokenAtualizacao(
      tokenAtualizacaoPersistido,
      tokenAtualizacao,
    );

    return serializarDto(RespostaAutenticacaoDto, {
      usuario,
      token_acesso: tokenAcesso,
      token_atualizacao: tokenAtualizacao,
    });
  }

  private async criarTokenAtualizacaoPersistido(
    usuarioId: string,
    familiaToken: string,
    contexto: { ip?: string; agenteUsuario?: string },
  ): Promise<TokenRefresh> {
    const tempoRefresh = this.configService.get<string>(
      'JWT_TEMPO_REFRESH',
      '30d',
    ) as StringValue;
    const intervaloMs = ms(tempoRefresh);

    if (typeof intervaloMs !== 'number') {
      throw new InternalServerErrorException(
        'Nao foi possivel interpretar o tempo de expiracao do token de atualizacao.',
      );
    }

    const expiraEm = new Date(Date.now() + intervaloMs);

    return this.prisma.tokenRefresh.create({
      data: {
        usuario_id: usuarioId,
        hash_token: 'pendente',
        familia_token: familiaToken,
        expira_em: expiraEm,
        ip_origem: contexto.ip,
        agente_usuario: contexto.agenteUsuario,
      },
    });
  }

  private async atualizarHashTokenAtualizacao(
    tokenPersistido: TokenRefresh,
    tokenAtualizacao: string,
  ): Promise<void> {
    const rodadas = this.configService.get<number>('RODADAS_HASH_SENHA', 10);
    await this.prisma.tokenRefresh.update({
      where: { id: tokenPersistido.id },
      data: {
        hash_token: await hash(tokenAtualizacao, rodadas),
      },
    });
  }

  private async revogarTokenAtualizacao(tokenId: string): Promise<void> {
    const token = await this.prisma.tokenRefresh.findUnique({
      where: { id: tokenId },
    });
    if (!token) {
      throw new NotFoundException('Token de atualizacao nao encontrado.');
    }

    await this.prisma.tokenRefresh.update({
      where: { id: tokenId },
      data: {
        ativo: false,
        revogado_em: new Date(),
        data_exclusao: new Date(),
      },
    });
  }

}

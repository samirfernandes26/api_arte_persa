import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PerfilUsuario, TokenRefresh, Usuario } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { randomUUID } from 'crypto';
import { StringValue } from 'ms';
import { PayloadToken } from '../comum/interfaces/payload-token.interface';
import { PrismaService } from '../prisma/prisma.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AutenticacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
    contexto: { ip?: string; userAgent?: string },
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

  async refresh(
    dto: RefreshTokenDto,
    contexto: { ip?: string; userAgent?: string },
  ) {
    let payload: PayloadToken;
    try {
      payload = await this.jwtService.verifyAsync<PayloadToken>(dto.refresh_token, {
        secret: this.configService.getOrThrow<string>('JWT_SEGREDO_REFRESH'),
        issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
        audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido ou expirado.');
    }

    if (payload.tipo !== 'refresh' || !payload.token_refresh_id) {
      throw new UnauthorizedException('Token informado nao e um refresh token.');
    }

    const tokenPersistido = await this.prisma.tokenRefresh.findUnique({
      where: { id: payload.token_refresh_id },
      include: { usuario: true },
    });

    if (!tokenPersistido || !tokenPersistido.ativo || tokenPersistido.revogado_em) {
      throw new UnauthorizedException('Refresh token revogado ou inexistente.');
    }

    if (tokenPersistido.expira_em.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expirado.');
    }

    const hashConfere = await compare(dto.refresh_token, tokenPersistido.hash_token);
    if (!hashConfere) {
      throw new UnauthorizedException('Refresh token invalido.');
    }

    if (!tokenPersistido.usuario.ativo || tokenPersistido.usuario.data_exclusao) {
      throw new ForbiddenException('Usuario inativo.');
    }

    await this.revogarTokenRefresh(tokenPersistido.id);

    return this.gerarParTokens(
      tokenPersistido.usuario,
      payload.familia_token ?? tokenPersistido.familia_token ?? randomUUID(),
      contexto,
    );
  }

  async logout(dto: RefreshTokenDto): Promise<{ mensagem: string }> {
    try {
      const payload = await this.jwtService.verifyAsync<PayloadToken>(dto.refresh_token, {
        secret: this.configService.getOrThrow<string>('JWT_SEGREDO_REFRESH'),
        issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
        audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
      });

      if (payload.token_refresh_id) {
        await this.revogarTokenRefresh(payload.token_refresh_id);
      }
    } catch {
      return { mensagem: 'Logout concluido.' };
    }

    return { mensagem: 'Logout concluido.' };
  }

  async obterUsuarioAutenticado(usuarioId: string) {
    const usuario = await this.usuariosService.buscarPorId(usuarioId);
    return this.serializarUsuario(usuario);
  }

  private async gerarParTokens(
    usuario: Usuario,
    familiaToken: string,
    contexto: { ip?: string; userAgent?: string },
  ) {
    const tokenRefreshPersistido = await this.criarTokenRefreshPersistido(
      usuario.id,
      familiaToken,
      contexto,
    );

    const payloadAcesso: PayloadToken = {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil as PerfilUsuario,
      tipo: 'acesso',
    };

    const payloadRefresh: PayloadToken = {
      ...payloadAcesso,
      tipo: 'refresh',
      familia_token: familiaToken,
      token_refresh_id: tokenRefreshPersistido.id,
    };

    const accessToken = await this.jwtService.signAsync(payloadAcesso, {
      secret: this.configService.getOrThrow<string>('JWT_SEGREDO_ACESSO'),
      expiresIn: this.configService.get<string>(
        'JWT_TEMPO_ACESSO',
        '15m',
      ) as StringValue,
      issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
      audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
    });

    const refreshToken = await this.jwtService.signAsync(payloadRefresh, {
      secret: this.configService.getOrThrow<string>('JWT_SEGREDO_REFRESH'),
      expiresIn: this.configService.get<string>(
        'JWT_TEMPO_REFRESH',
        '30d',
      ) as StringValue,
      issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
      audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
    });

    await this.atualizarHashTokenRefresh(tokenRefreshPersistido, refreshToken);

    return {
      usuario: this.serializarUsuario(usuario),
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async criarTokenRefreshPersistido(
    usuarioId: string,
    familiaToken: string,
    contexto: { ip?: string; userAgent?: string },
  ): Promise<TokenRefresh> {
    const dias = 30;
    const expiraEm = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

    return this.prisma.tokenRefresh.create({
      data: {
        usuario_id: usuarioId,
        hash_token: 'pendente',
        familia_token: familiaToken,
        expira_em: expiraEm,
        ip_origem: contexto.ip,
        user_agent: contexto.userAgent,
      },
    });
  }

  private async atualizarHashTokenRefresh(
    tokenPersistido: TokenRefresh,
    refreshToken: string,
  ): Promise<void> {
    const rodadas = this.configService.get<number>('RODADAS_HASH_SENHA', 10);
    await this.prisma.tokenRefresh.update({
      where: { id: tokenPersistido.id },
      data: {
        hash_token: await hash(refreshToken, rodadas),
      },
    });
  }

  private async revogarTokenRefresh(tokenId: string): Promise<void> {
    const token = await this.prisma.tokenRefresh.findUnique({ where: { id: tokenId } });
    if (!token) {
      throw new NotFoundException('Refresh token nao encontrado.');
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

  private serializarUsuario(usuario: Usuario) {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      ultimo_login_em: usuario.ultimo_login_em,
    };
  }
}

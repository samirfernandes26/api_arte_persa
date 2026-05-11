import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CHAVE_ROTA_PUBLICA } from '../decoradores/publico.decorator';
import { PayloadToken } from '../interfaces/payload-token.interface';
import { RequisicaoAutenticada } from '../interfaces/requisicao-autenticada.interface';

@Injectable()
export class GuardaAutenticacaoJwt implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ePublica = this.reflector.getAllAndOverride<boolean>(CHAVE_ROTA_PUBLICA, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (ePublica) {
      return true;
    }

    const requisicao = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const token = this.extrairBearer(requisicao);

    if (!token) {
      throw new UnauthorizedException('Token de acesso nao informado.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadToken>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SEGREDO_ACESSO'),
        issuer: this.configService.get<string>('JWT_EMISSOR') || undefined,
        audience: this.configService.get<string>('JWT_AUDIENCIA') || undefined,
      });

      if (payload.tipo !== 'acesso') {
        throw new UnauthorizedException('Token enviado nao e um token de acesso.');
      }

      requisicao.usuario = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token de acesso invalido ou expirado.');
    }
  }

  private extrairBearer(requisicao: RequisicaoAutenticada): string | null {
    const autorizacao = requisicao.headers.authorization;

    if (!autorizacao?.startsWith('Bearer ')) {
      return null;
    }

    return autorizacao.slice('Bearer '.length);
  }
}

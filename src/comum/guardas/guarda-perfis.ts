import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CHAVE_PERFIS } from '../decoradores/perfis.decorator';
import { PerfilUsuario } from '../enums/perfil-usuario.enum';
import { RequisicaoAutenticada } from '../interfaces/requisicao-autenticada.interface';

@Injectable()
export class GuardaPerfis implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const perfis = this.reflector.getAllAndOverride<PerfilUsuario[]>(CHAVE_PERFIS, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!perfis || perfis.length === 0) {
      return true;
    }

    const requisicao = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    const perfil = requisicao.usuario?.perfil as PerfilUsuario | undefined;

    if (!perfil || !perfis.includes(perfil)) {
      throw new ForbiddenException('Seu perfil nao possui acesso a este recurso.');
    }

    return true;
  }
}

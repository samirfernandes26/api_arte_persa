import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequisicaoAutenticada } from '../interfaces/requisicao-autenticada.interface';

export const UsuarioAtual = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const requisicao = context.switchToHttp().getRequest<RequisicaoAutenticada>();
    return requisicao.usuario;
  },
);

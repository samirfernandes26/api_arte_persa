import { ForbiddenException } from '@nestjs/common';
import { PerfilUsuario } from '../enums/perfil-usuario.enum';

export const obterLimiteDescontoPorPerfil = (
  perfil: PerfilUsuario,
  limites: Record<PerfilUsuario, number>,
): number => limites[perfil];

export const validarDescontoPorPerfil = ({
  perfilSolicitante,
  percentualSolicitado,
  perfilAprovador,
  limites,
}: {
  perfilSolicitante: PerfilUsuario;
  percentualSolicitado: number;
  perfilAprovador?: PerfilUsuario | null;
  limites: Record<PerfilUsuario, number>;
}): void => {
  const limiteSolicitante = obterLimiteDescontoPorPerfil(
    perfilSolicitante,
    limites,
  );

  if (percentualSolicitado <= limiteSolicitante) {
    return;
  }

  if (!perfilAprovador) {
    throw new ForbiddenException(
      `O perfil ${perfilSolicitante} nao pode aplicar ${percentualSolicitado}% sem aprovacao.`,
    );
  }

  const limiteAprovador = obterLimiteDescontoPorPerfil(perfilAprovador, limites);
  if (percentualSolicitado > limiteAprovador) {
    throw new ForbiddenException(
      `O aprovador informado nao pode autorizar ${percentualSolicitado}% de desconto.`,
    );
  }
};

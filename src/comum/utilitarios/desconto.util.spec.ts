import { ForbiddenException } from '@nestjs/common';
import { PerfilUsuario } from '../enums/perfil-usuario.enum';
import { validarDescontoPorPerfil } from './desconto.util';

describe('validarDescontoPorPerfil', () => {
  const limites = {
    [PerfilUsuario.FUNCIONARIO]: 10,
    [PerfilUsuario.SUPERVISOR]: 20,
    [PerfilUsuario.MASTER]: 100,
  };

  it('permite desconto dentro do limite do solicitante', () => {
    expect(() =>
      validarDescontoPorPerfil({
        perfilSolicitante: PerfilUsuario.FUNCIONARIO,
        percentualSolicitado: 10,
        limites,
      }),
    ).not.toThrow();
  });

  it('bloqueia desconto acima do limite sem aprovacao', () => {
    expect(() =>
      validarDescontoPorPerfil({
        perfilSolicitante: PerfilUsuario.FUNCIONARIO,
        percentualSolicitado: 15,
        limites,
      }),
    ).toThrow(ForbiddenException);
  });

  it('permite desconto acima do limite quando o aprovador suporta o percentual', () => {
    expect(() =>
      validarDescontoPorPerfil({
        perfilSolicitante: PerfilUsuario.FUNCIONARIO,
        percentualSolicitado: 15,
        perfilAprovador: PerfilUsuario.SUPERVISOR,
        limites,
      }),
    ).not.toThrow();
  });
});

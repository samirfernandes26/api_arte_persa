import { PerfilUsuario } from '../../../src/comum/enums/perfil-usuario.enum';

let sequenciaUsuarios = 0;

export interface CriarPayloadUsuarioSaida {
  nome: string;
  email: string;
  senha: string;
  perfil?: PerfilUsuario;
}

export function criarPayloadPrimeiroMaster(
  parcial?: Partial<CriarPayloadUsuarioSaida>,
): CriarPayloadUsuarioSaida {
  sequenciaUsuarios += 1;
  return {
    nome: parcial?.nome ?? `Master Teste ${sequenciaUsuarios}`,
    email:
      parcial?.email ?? `master${sequenciaUsuarios}@integracao.local`,
    senha: parcial?.senha ?? 'SenhaForte@123',
    perfil: PerfilUsuario.MASTER,
  };
}

export function criarPayloadUsuario(
  parcial?: Partial<CriarPayloadUsuarioSaida>,
): CriarPayloadUsuarioSaida {
  sequenciaUsuarios += 1;
  return {
    nome: parcial?.nome ?? `Usuario Teste ${sequenciaUsuarios}`,
    email:
      parcial?.email ?? `usuario${sequenciaUsuarios}@integracao.local`,
    senha: parcial?.senha ?? 'SenhaForte@123',
    perfil: parcial?.perfil ?? PerfilUsuario.FUNCIONARIO,
  };
}

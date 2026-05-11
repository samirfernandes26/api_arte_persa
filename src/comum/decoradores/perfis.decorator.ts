import { SetMetadata } from '@nestjs/common';
import { PerfilUsuario } from '../enums/perfil-usuario.enum';

export const CHAVE_PERFIS = 'perfis_permitidos';

export const Perfis = (...perfis: PerfilUsuario[]) =>
  SetMetadata(CHAVE_PERFIS, perfis);

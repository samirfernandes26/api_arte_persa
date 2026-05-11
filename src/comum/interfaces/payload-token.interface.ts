import { PerfilUsuario } from '../enums/perfil-usuario.enum';

export interface PayloadToken {
  sub: string;
  email: string;
  perfil: PerfilUsuario | string;
  tipo: 'acesso' | 'refresh';
  familia_token?: string;
  token_refresh_id?: string;
  iat?: number;
  exp?: number;
  aud?: string | string[];
  iss?: string;
}

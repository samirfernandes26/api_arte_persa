import { PerfilUsuario } from '../enums/perfil-usuario.enum';

export interface PayloadAutenticacao {
  sub: string;
  email: string;
  perfil: PerfilUsuario | string;
  tipo: 'acesso' | 'refresh';
  familia_token?: string;
  token_atualizacao_id?: string;
  iat?: number;
  exp?: number;
  aud?: string | string[];
  iss?: string;
}

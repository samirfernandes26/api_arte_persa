import { PerfilUsuario } from '../enums/perfil-usuario.enum';

export interface PayloadAutenticacao {
  sub: number;
  email: string;
  perfil: PerfilUsuario | string;
  tipo: 'acesso' | 'refresh';
  familia_token?: string;
  token_atualizacao_id?: number;
  iat?: number;
  exp?: number;
  aud?: string | string[];
  iss?: string;
}

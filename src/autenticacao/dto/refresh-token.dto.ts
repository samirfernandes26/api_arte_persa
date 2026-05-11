import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Exemplo de payload:
 * {
 *   "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * Esse DTO e mantido enxuto porque o token ja sera validado criptograficamente
 * pelo servico de autenticacao.
 */
export class RefreshTokenDto {
  @IsString({ message: 'O refresh token precisa ser uma string.' })
  @IsNotEmpty({ message: 'O refresh token e obrigatorio.' })
  refresh_token!: string;
}

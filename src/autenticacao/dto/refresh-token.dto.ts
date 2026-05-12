import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Exemplo de payload:
 * {
 *   "token_atualizacao": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * }
 *
 * Esse DTO e mantido enxuto porque o token ja sera validado criptograficamente
 * pelo servico de autenticacao.
 */
export class TokenAtualizacaoDto {
  @IsString({ message: 'O token de atualizacao precisa ser uma string.' })
  @IsNotEmpty({ message: 'O token de atualizacao e obrigatorio.' })
  token_atualizacao!: string;
}

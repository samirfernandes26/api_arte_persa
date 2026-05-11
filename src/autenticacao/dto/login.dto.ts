import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Exemplo de payload:
 * {
 *   "email": "master@empresa.com.br",
 *   "senha": "SenhaSegura@123"
 * }
 *
 * Regras importantes:
 * - `email` precisa estar em formato valido.
 * - `senha` exige no minimo 8 caracteres para evitar logins com credenciais fracas.
 */
export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail valido.' })
  email!: string;

  @IsString({ message: 'A senha precisa ser uma string.' })
  @IsNotEmpty({ message: 'A senha e obrigatoria.' })
  @MinLength(8, { message: 'A senha precisa ter no minimo 8 caracteres.' })
  senha!: string;
}

import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { PerfilUsuario } from '../../comum/enums/perfil-usuario.enum';

/**
 * Exemplo de payload:
 * {
 *   "nome": "Maria Supervisora",
 *   "email": "maria.supervisora@empresa.com.br",
 *   "senha": "SenhaForte@123",
 *   "perfil": "supervisor"
 * }
 *
 * Validacoes em destaque:
 * - `nome` recebe trim automatico.
 * - `senha` exige minimo de 8 caracteres.
 * - `perfil` so aceita os niveis previstos no enum.
 */
export class CriarUsuarioDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'O nome precisa ser uma string.' })
  @IsNotEmpty({ message: 'O nome e obrigatorio.' })
  nome!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Informe um e-mail valido.' })
  email!: string;

  @IsString({ message: 'A senha precisa ser uma string.' })
  @MinLength(8, { message: 'A senha precisa ter no minimo 8 caracteres.' })
  senha!: string;

  @IsOptional()
  @IsEnum(PerfilUsuario, { message: 'Perfil de usuario invalido.' })
  perfil?: PerfilUsuario;
}

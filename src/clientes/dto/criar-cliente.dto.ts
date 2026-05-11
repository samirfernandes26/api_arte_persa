import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TipoContatoCliente } from '../../comum/enums/tipo-contato-cliente.enum';
import { TipoEnderecoCliente } from '../../comum/enums/tipo-endereco-cliente.enum';
import { TipoPessoaCliente } from '../../comum/enums/tipo-pessoa-cliente.enum';

export class CriarContatoClienteDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsOptional()
  @IsString()
  setor?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsEnum(TipoContatoCliente)
  tipo_contato!: TipoContatoCliente;

  @IsString()
  @IsNotEmpty()
  valor!: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}

export class CriarEnderecoClienteDto {
  @IsEnum(TipoEnderecoCliente)
  tipo_endereco!: TipoEnderecoCliente;

  @IsOptional()
  @IsString()
  rotulo?: string;

  @IsOptional()
  @IsString()
  destinatario?: string;

  @IsOptional()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP invalido.' })
  cep?: string;

  @IsString()
  @IsNotEmpty()
  logradouro!: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsString()
  @IsNotEmpty()
  cidade!: string;

  @Length(2, 2, { message: 'O estado deve ter 2 caracteres.' })
  estado!: string;

  @IsOptional()
  @IsBoolean()
  principal?: boolean;
}

/**
 * Exemplo de payload:
 * {
 *   "tipo_pessoa": "pessoa_fisica",
 *   "documento": "12345678900",
 *   "nome_razao_social": "Joao da Silva",
 *   "nome_fantasia_apelido": "Joao",
 *   "email_principal": "joao@email.com",
 *   "telefone_principal": "11999999999",
 *   "contatos": [
 *     {
 *       "nome": "Joao da Silva",
 *       "tipo_contato": "whatsapp",
 *       "valor": "11999999999",
 *       "principal": true
 *     }
 *   ],
 *   "enderecos": [
 *     {
 *       "tipo_endereco": "coleta",
 *       "logradouro": "Rua das Flores",
 *       "numero": "100",
 *       "cidade": "Sao Paulo",
 *       "estado": "SP",
 *       "principal": true
 *     }
 *   ]
 * }
 */
export class CriarClienteDto {
  @IsEnum(TipoPessoaCliente, { message: 'Tipo de pessoa invalido.' })
  tipo_pessoa!: TipoPessoaCliente;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  documento?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nome_razao_social!: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  nome_fantasia_apelido?: string;

  @IsOptional()
  @IsEmail({}, { message: 'E-mail principal invalido.' })
  email_principal?: string;

  @IsOptional()
  @IsString()
  telefone_principal?: string;

  @IsOptional()
  @IsString()
  observacoes_internas?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Limite maximo de 10 contatos por cliente.' })
  @ValidateNested({ each: true })
  @Type(() => CriarContatoClienteDto)
  contatos?: CriarContatoClienteDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Limite maximo de 10 enderecos por cliente.' })
  @ValidateNested({ each: true })
  @Type(() => CriarEnderecoClienteDto)
  enderecos?: CriarEnderecoClienteDto[];
}

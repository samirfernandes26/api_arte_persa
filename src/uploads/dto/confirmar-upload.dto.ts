import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class ConfirmarImagemOrdemServicoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordem_servico_id!: number;

  @IsString()
  @IsNotEmpty()
  chave_s3!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nome_arquivo!: string;

  @Matches(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i)
  tipo_mime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  tamanho_bytes!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem_exibicao?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  rotulo?: string;
}

export class ConfirmarArquivoClienteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cliente_id!: number;

  @IsString()
  @IsNotEmpty()
  chave_s3!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nome_arquivo!: string;

  @Matches(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i)
  tipo_mime!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  tamanho_bytes!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  rotulo?: string;
}

export class ConfirmarAssinaturaOrdemServicoDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordem_servico_id!: number;

  @IsString()
  @IsNotEmpty()
  chave_s3!: string;
}

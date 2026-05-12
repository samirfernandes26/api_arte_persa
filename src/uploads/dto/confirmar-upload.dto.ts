import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class ConfirmarImagemOrdemServicoDto {
  @IsUUID()
  ordem_servico_id!: string;

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
  @IsUUID()
  cliente_id!: string;

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
  @IsUUID()
  ordem_servico_id!: string;

  @IsString()
  @IsNotEmpty()
  chave_s3!: string;

}

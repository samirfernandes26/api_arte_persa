import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UnidadeCobrancaServico } from '../../comum/enums/unidade-cobranca-servico.enum';

export class CriarServicoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preco_base!: number;

  @IsOptional()
  @IsEnum(UnidadeCobrancaServico)
  unidade_cobranca?: UnidadeCobrancaServico;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prazo_medio_dias?: number;
}

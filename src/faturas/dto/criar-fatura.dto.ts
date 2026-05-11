import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MetodoPagamento } from '../../comum/enums/metodo-pagamento.enum';

export class CriarFaturaDto {
  @IsUUID()
  ordem_servico_id!: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsDateString()
  vencimento_em?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_subtotal!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_desconto?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_impostos?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_total!: number;

  @IsOptional()
  @IsEnum(MetodoPagamento)
  metodo_pagamento?: MetodoPagamento;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

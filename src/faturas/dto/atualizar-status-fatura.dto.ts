import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MetodoPagamento } from '../../comum/enums/metodo-pagamento.enum';
import { StatusFatura } from '../../comum/enums/status-fatura.enum';

export class AtualizarStatusFaturaDto {
  @IsEnum(StatusFatura)
  status!: StatusFatura;

  @IsOptional()
  @IsEnum(MetodoPagamento)
  metodo_pagamento?: MetodoPagamento;

  @IsOptional()
  @IsString()
  observacoes?: string;
}

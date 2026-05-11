import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class AtualizarItemOrdemServicoDto {
  @IsOptional()
  @IsString()
  estado_atual?: string;

  @IsOptional()
  @IsString()
  cuidados_especiais?: string;

  @IsOptional()
  @IsString()
  chave_foto_inicial?: string;

  @IsOptional()
  @IsString()
  url_foto_inicial?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valor_declarado?: number;
}

import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginacaoConsultaDto } from '../../comum/dto/paginacao-consulta.dto';
import { StatusFatura } from '../../comum/enums/status-fatura.enum';

export class ConsultarFaturasDto extends PaginacaoConsultaDto {
  @IsOptional()
  @IsEnum(StatusFatura)
  status?: StatusFatura;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordem_servico_id?: number;
}

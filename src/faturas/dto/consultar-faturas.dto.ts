import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoConsultaDto } from '../../comum/dto/paginacao-consulta.dto';
import { StatusFatura } from '../../comum/enums/status-fatura.enum';

export class ConsultarFaturasDto extends PaginacaoConsultaDto {
  @IsOptional()
  @IsEnum(StatusFatura)
  status?: StatusFatura;

  @IsOptional()
  @IsUUID()
  ordem_servico_id?: string;
}

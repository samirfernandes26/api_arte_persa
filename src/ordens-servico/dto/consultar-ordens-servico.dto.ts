import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginacaoConsultaDto } from '../../comum/dto/paginacao-consulta.dto';
import { StatusOrdemServico } from '../../comum/enums/status-ordem-servico.enum';

export class ConsultarOrdensServicoDto extends PaginacaoConsultaDto {
  @IsOptional()
  @IsEnum(StatusOrdemServico)
  status?: StatusOrdemServico;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cliente_id?: number;
}

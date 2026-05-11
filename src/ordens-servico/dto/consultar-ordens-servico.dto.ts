import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginacaoConsultaDto } from '../../comum/dto/paginacao-consulta.dto';
import { StatusOrdemServico } from '../../comum/enums/status-ordem-servico.enum';

export class ConsultarOrdensServicoDto extends PaginacaoConsultaDto {
  @IsOptional()
  @IsEnum(StatusOrdemServico)
  status?: StatusOrdemServico;

  @IsOptional()
  @IsUUID()
  cliente_id?: string;
}

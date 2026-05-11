import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusOrdemServico } from '../../comum/enums/status-ordem-servico.enum';

export class AtualizarStatusOrdemServicoDto {
  @IsEnum(StatusOrdemServico)
  status!: StatusOrdemServico;

  @IsOptional()
  @IsString()
  motivo?: string;
}

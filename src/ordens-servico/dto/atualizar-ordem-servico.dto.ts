import { PartialType } from '@nestjs/mapped-types';
import { CriarOrdemServicoDto } from './criar-ordem-servico.dto';

export class AtualizarOrdemServicoDto extends PartialType(CriarOrdemServicoDto) {}

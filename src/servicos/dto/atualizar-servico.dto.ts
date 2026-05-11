import { PartialType } from '@nestjs/mapped-types';
import { CriarServicoDto } from './criar-servico.dto';

export class AtualizarServicoDto extends PartialType(CriarServicoDto) {}

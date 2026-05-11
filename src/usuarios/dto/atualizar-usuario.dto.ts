import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CriarUsuarioDto } from './criar-usuario.dto';

export class AtualizarUsuarioDto extends PartialType(CriarUsuarioDto) {
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}

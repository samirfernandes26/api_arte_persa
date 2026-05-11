import { PartialType } from '@nestjs/mapped-types';
import { CriarClienteDto } from './criar-cliente.dto';

/**
 * DTO de atualizacao parcial.
 * Aproveita todas as validacoes do DTO de criacao e torna os campos opcionais.
 */
export class AtualizarClienteDto extends PartialType(CriarClienteDto) {}

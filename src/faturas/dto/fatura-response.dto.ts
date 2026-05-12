import { Exclude, Expose, Type } from 'class-transformer';
import { MetodoPagamento } from '../../comum/enums/metodo-pagamento.enum';
import { StatusFatura } from '../../comum/enums/status-fatura.enum';
import { ObservacaoResponseDto } from '../../observacoes/dto/observacao-response.dto';
import { UsuarioResumidoDto } from '../../usuarios/dto/usuario-response.dto';

@Exclude()
export class ClienteResumoFaturaDto {
  @Expose()
  id!: number;

  @Expose()
  nome_razao_social!: string;

  @Expose()
  email_principal?: string | null;
}

@Exclude()
export class OrdemServicoResumoFaturaDto {
  @Expose()
  id!: number;

  @Expose()
  codigo!: string;

  @Expose()
  @Type(() => ClienteResumoFaturaDto)
  cliente?: ClienteResumoFaturaDto;
}

@Exclude()
export class FaturaResponseDto {
  @Expose()
  id!: number;

  @Expose()
  ordem_servico_id!: number;

  @Expose()
  numero!: string;

  @Expose()
  status!: StatusFatura;

  @Expose()
  emitida_em?: Date | null;

  @Expose()
  vencimento_em?: Date | null;

  @Expose()
  paga_em?: Date | null;

  @Expose()
  metodo_pagamento?: MetodoPagamento | null;

  @Expose()
  valor_subtotal!: string;

  @Expose()
  valor_desconto!: string;

  @Expose()
  valor_impostos!: string;

  @Expose()
  valor_total!: string;

  @Expose()
  observacoes?: string | null;

  @Expose()
  chave_pdf?: string | null;

  @Expose()
  url_pdf?: string | null;

  @Expose()
  ativo!: boolean;

  @Expose()
  data_criacao!: Date;

  @Expose()
  data_atualizacao!: Date;

  @Expose()
  @Type(() => OrdemServicoResumoFaturaDto)
  ordem_servico?: OrdemServicoResumoFaturaDto;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  criado_por?: UsuarioResumidoDto | null;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  atualizado_por?: UsuarioResumidoDto | null;

  @Expose()
  @Type(() => ObservacaoResponseDto)
  observacoes_relacionadas?: ObservacaoResponseDto[];
}

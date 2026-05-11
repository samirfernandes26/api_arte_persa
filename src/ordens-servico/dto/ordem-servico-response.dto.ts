import { Exclude, Expose, Type } from 'class-transformer';
import { CanalEntradaOrdemServico } from '../../comum/enums/canal-entrada-ordem-servico.enum';
import { CategoriaItem } from '../../comum/enums/categoria-item.enum';
import { MaterialItem } from '../../comum/enums/material-item.enum';
import { StatusOrdemServico } from '../../comum/enums/status-ordem-servico.enum';
import { UnidadeCobrancaServico } from '../../comum/enums/unidade-cobranca-servico.enum';
import { ObservacaoResponseDto } from '../../observacoes/dto/observacao-response.dto';
import { UsuarioResumidoDto } from '../../usuarios/dto/usuario-response.dto';

@Exclude()
export class ClienteResumoOrdemServicoDto {
  @Expose()
  id!: string;

  @Expose()
  nome_razao_social!: string;

  @Expose()
  email_principal?: string | null;

  @Expose()
  telefone_principal?: string | null;
}

@Exclude()
export class ServicoExecutadoItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  servico_catalogo_id?: string | null;

  @Expose()
  nome_servico_snapshot!: string;

  @Expose()
  categoria_servico_snapshot?: string | null;

  @Expose()
  unidade_cobranca_snapshot!: UnidadeCobrancaServico;

  @Expose()
  valor_unitario_snapshot!: string;

  @Expose()
  quantidade!: string;

  @Expose()
  valor_desconto!: string;

  @Expose()
  valor_total!: string;

  @Expose()
  observacoes?: string | null;
}

@Exclude()
export class ItemOrdemServicoResponseDto {
  @Expose()
  id!: string;

  @Expose()
  descricao!: string;

  @Expose()
  categoria!: CategoriaItem;

  @Expose()
  material?: MaterialItem | null;

  @Expose()
  quantidade!: number;

  @Expose()
  largura_cm?: string | null;

  @Expose()
  altura_cm?: string | null;

  @Expose()
  profundidade_cm?: string | null;

  @Expose()
  area_m2?: string | null;

  @Expose()
  valor_declarado?: string | null;

  @Expose()
  estado_atual?: string | null;

  @Expose()
  cuidados_especiais?: string | null;

  @Expose()
  valor_unitario_base!: string;

  @Expose()
  valor_unitario_desconto!: string;

  @Expose()
  valor_unitario_final!: string;

  @Expose()
  valor_total_bruto!: string;

  @Expose()
  valor_total_desconto!: string;

  @Expose()
  valor_total_final!: string;

  @Expose()
  chave_foto_inicial?: string | null;

  @Expose()
  url_foto_inicial?: string | null;

  @Expose()
  @Type(() => ServicoExecutadoItemResponseDto)
  servicos_executados?: ServicoExecutadoItemResponseDto[];

  @Expose()
  @Type(() => ObservacaoResponseDto)
  observacoes?: ObservacaoResponseDto[];
}

@Exclude()
export class HistoricoStatusOrdemServicoResponseDto {
  @Expose()
  id!: string;

  @Expose()
  status_origem?: StatusOrdemServico | null;

  @Expose()
  status_destino!: StatusOrdemServico;

  @Expose()
  motivo?: string | null;

  @Expose()
  metadados?: Record<string, unknown> | null;

  @Expose()
  data_criacao!: Date;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  usuario!: UsuarioResumidoDto;
}

@Exclude()
export class ImagemOrdemServicoResponseDto {
  @Expose()
  id!: string;

  @Expose()
  chave_s3!: string;

  @Expose()
  url_arquivo?: string | null;

  @Expose()
  nome_arquivo!: string;

  @Expose()
  tipo_mime!: string;

  @Expose()
  tamanho_bytes!: number;

  @Expose()
  ordem_exibicao!: number;

  @Expose()
  rotulo?: string | null;
}

@Exclude()
export class FaturaResumoOrdemServicoDto {
  @Expose()
  id!: string;

  @Expose()
  numero!: string;

  @Expose()
  status!: string;

  @Expose()
  valor_total!: string;
}

@Exclude()
export class OrdemServicoResumoResponseDto {
  @Expose()
  id!: string;

  @Expose()
  codigo!: string;

  @Expose()
  cliente_id!: string;

  @Expose()
  status!: StatusOrdemServico;

  @Expose()
  canal_entrada!: CanalEntradaOrdemServico;

  @Expose()
  percentual_desconto!: string;

  @Expose()
  valor_desconto!: string;

  @Expose()
  valor_frete!: string;

  @Expose()
  valor_subtotal!: string;

  @Expose()
  valor_total!: string;

  @Expose()
  data_criacao!: Date;

  @Expose()
  @Type(() => ClienteResumoOrdemServicoDto)
  cliente?: ClienteResumoOrdemServicoDto;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  responsavel?: UsuarioResumidoDto | null;
}

@Exclude()
export class OrdemServicoResponseDto extends OrdemServicoResumoResponseDto {
  @Expose()
  agendada_coleta_em?: Date | null;

  @Expose()
  agendada_entrega_em?: Date | null;

  @Expose()
  iniciada_em?: Date | null;

  @Expose()
  finalizada_em?: Date | null;

  @Expose()
  cancelada_em?: Date | null;

  @Expose()
  snapshot_endereco_coleta?: Record<string, unknown> | null;

  @Expose()
  snapshot_endereco_entrega?: Record<string, unknown> | null;

  @Expose()
  snapshot_cliente?: Record<string, unknown> | null;

  @Expose()
  snapshot_politica_desconto?: Record<string, unknown> | null;

  @Expose()
  motivo_desconto?: string | null;

  @Expose()
  observacoes_internas?: string | null;

  @Expose()
  observacoes_cliente?: string | null;

  @Expose()
  chave_assinatura_cliente?: string | null;

  @Expose()
  url_assinatura_cliente?: string | null;

  @Expose()
  assinada_em?: Date | null;

  @Expose()
  chave_pdf?: string | null;

  @Expose()
  url_pdf?: string | null;

  @Expose()
  ativo!: boolean;

  @Expose()
  data_atualizacao!: Date;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  criado_por!: UsuarioResumidoDto;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  atualizado_por?: UsuarioResumidoDto | null;

  @Expose()
  @Type(() => UsuarioResumidoDto)
  aprovado_por_desconto?: UsuarioResumidoDto | null;

  @Expose()
  @Type(() => ItemOrdemServicoResponseDto)
  itens?: ItemOrdemServicoResponseDto[];

  @Expose()
  @Type(() => HistoricoStatusOrdemServicoResponseDto)
  historico_status?: HistoricoStatusOrdemServicoResponseDto[];

  @Expose()
  @Type(() => ObservacaoResponseDto)
  observacoes?: ObservacaoResponseDto[];

  @Expose()
  @Type(() => ImagemOrdemServicoResponseDto)
  imagens?: ImagemOrdemServicoResponseDto[];

  @Expose()
  @Type(() => FaturaResumoOrdemServicoDto)
  fatura?: FaturaResumoOrdemServicoDto | null;
}

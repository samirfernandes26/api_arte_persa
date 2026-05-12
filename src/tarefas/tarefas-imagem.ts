export type FormatoImagemSuportado = 'jpeg' | 'png' | 'webp';

export interface TarefaOtimizacaoImagem {
  ordem_servico_id: number;
  chave_origem: string;
  chave_destino?: string;
  tipo_conteudo?: string;
  formato?: FormatoImagemSuportado;
  qualidade?: number;
  largura_maxima?: number;
  altura_maxima?: number;
  apagar_origem_apos_processamento?: boolean;
  metadados?: Record<string, string | number>;
}

export interface ResultadoTarefaOtimizacaoImagem {
  chave: string;
  url: string;
  tipo_conteudo: string;
  tamanho_bytes: number;
  processado_em: string;
}

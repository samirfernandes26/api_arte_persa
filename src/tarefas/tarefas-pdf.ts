export interface LinhaPdfOrdemServico {
  descricao: string;
  quantidade: number;
  valor_total: string;
}

export interface TarefaGeracaoPdfOrdemServico {
  ordem_servico_id: string;
  codigo_ordem_servico: string;
  nome_cliente: string;
  status: string;
  chave_arquivo?: string;
  observacoes?: string;
  valor_subtotal?: string;
  valor_desconto?: string;
  valor_total?: string;
  itens?: LinhaPdfOrdemServico[];
}

export interface ResultadoTarefaGeracaoPdfOrdemServico {
  chave: string;
  url: string;
  paginas: number;
  gerado_em: string;
}

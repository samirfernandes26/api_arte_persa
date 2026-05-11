let sequenciaServicos = 0;

export function criarPayloadServico(parcial?: Record<string, unknown>) {
  sequenciaServicos += 1;

  return {
    nome: `Lavagem Premium ${sequenciaServicos}`,
    descricao: 'Servico utilizado em testes de integracao.',
    categoria: 'lavagem',
    preco_base: 800,
    unidade_cobranca: 'unidade',
    prazo_medio_dias: 7,
    ...parcial,
  };
}

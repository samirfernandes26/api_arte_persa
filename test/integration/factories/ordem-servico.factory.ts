let sequenciaOrdens = 0;

export function criarPayloadOrdemServico(parametros: {
  clienteId: string;
  servicoCatalogoId: string;
  responsavelId?: string;
  aprovadoPorDescontoId?: string;
  percentualDesconto?: number;
}) {
  sequenciaOrdens += 1;

  return {
    cliente_id: parametros.clienteId,
    canal_entrada: 'whatsapp',
    responsavel_id: parametros.responsavelId,
    aprovado_por_desconto_id: parametros.aprovadoPorDescontoId,
    percentual_desconto: parametros.percentualDesconto ?? 5,
    valor_frete: 30,
    motivo_desconto: 'Campanha de captacao',
    observacoes_internas: `Ordem de teste ${sequenciaOrdens}`,
    observacoes_cliente: 'Retirar e entregar no horario comercial.',
    itens: [
      {
        descricao: `Tapete Persa Sala ${sequenciaOrdens}`,
        categoria: 'tapete_persa',
        material: 'la',
        quantidade: 1,
        largura_cm: 250,
        altura_cm: 350,
        valor_declarado: 5000,
        estado_atual: 'Bom estado',
        cuidados_especiais: 'Nao dobrar excessivamente',
        servicos_executados: [
          {
            servico_catalogo_id: parametros.servicoCatalogoId,
            valor_unitario_snapshot: 800,
            quantidade: 1,
            valor_desconto: 50,
          },
        ],
      },
    ],
  };
}

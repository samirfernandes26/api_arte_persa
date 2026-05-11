let sequenciaClientes = 0;

export function criarPayloadCliente(parcial?: Record<string, unknown>) {
  sequenciaClientes += 1;

  return {
    tipo_pessoa: 'pessoa_fisica',
    documento: `1234567890${sequenciaClientes}`,
    nome_razao_social: `Cliente Integracao ${sequenciaClientes}`,
    nome_fantasia_apelido: `Cliente ${sequenciaClientes}`,
    email_principal: `cliente${sequenciaClientes}@integracao.local`,
    telefone_principal: `1199999000${sequenciaClientes}`,
    observacoes_internas: 'Cliente criado via factory de integracao.',
    contatos: [
      {
        nome: `Contato Principal ${sequenciaClientes}`,
        tipo_contato: 'whatsapp',
        valor: `1198888000${sequenciaClientes}`,
        principal: true,
      },
      {
        nome: `Contato Financeiro ${sequenciaClientes}`,
        tipo_contato: 'email',
        valor: `financeiro${sequenciaClientes}@integracao.local`,
        principal: false,
      },
    ],
    enderecos: [
      {
        tipo_endereco: 'coleta',
        logradouro: `Rua Integracao ${sequenciaClientes}`,
        numero: '100',
        cidade: 'Sao Paulo',
        estado: 'SP',
        principal: true,
      },
      {
        tipo_endereco: 'entrega',
        logradouro: `Avenida Entrega ${sequenciaClientes}`,
        numero: '200',
        cidade: 'Sao Paulo',
        estado: 'SP',
        principal: false,
      },
    ],
    ...parcial,
  };
}

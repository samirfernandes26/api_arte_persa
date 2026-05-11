# Banco de dados e Schema Prisma

## Visao geral

O schema Prisma foi modelado integralmente em Portugues Brasileiro e usa:

- UUID em todas as tabelas
- `ativo` para soft delete logico
- `data_criacao`, `data_atualizacao` e `data_exclusao`
- relacoes auditaveis com `criado_por_id` e `atualizado_por_id` onde faz sentido

Arquivo fonte: [prisma/schema.prisma](../prisma/schema.prisma)

## Enums principais

| Enum | Valores |
| --- | --- |
| `PerfilUsuario` | `funcionario`, `supervisor`, `master` |
| `TipoPessoaCliente` | `pessoa_fisica`, `pessoa_juridica` |
| `TipoContatoCliente` | `telefone`, `celular`, `whatsapp`, `email`, `outro` |
| `TipoEnderecoCliente` | `cobranca`, `coleta`, `entrega`, `outro` |
| `CanalEntradaOrdemServico` | `whatsapp`, `telefone`, `email`, `site`, `presencial`, `marketplace`, `outro` |
| `CategoriaItem` | `tapete_persa`, `estofado`, `carpete`, `cortina`, `colchao`, `cadeira`, `sofa`, `poltrona`, `outro` |
| `MaterialItem` | `la`, `seda`, `algodao`, `sintetico`, `couro`, `linho`, `veludo`, `misto`, `outro` |
| `UnidadeCobrancaServico` | `unidade`, `metro_quadrado`, `metro_linear` |
| `StatusOrdemServico` | `aberta`, `aguardando_coleta`, `coletada`, `em_higienizacao`, `em_manutencao`, `controle_qualidade`, `pronta_para_entrega`, `entregue`, `cancelada` |
| `TipoAlvoObservacao` | `ordem_servico`, `item_ordem_servico`, `cliente`, `fatura` |
| `VisibilidadeObservacao` | `interna`, `externa` |
| `StatusFatura` | `rascunho`, `emitida`, `paga`, `vencida`, `cancelada` |
| `MetodoPagamento` | `dinheiro`, `pix`, `cartao_credito`, `cartao_debito`, `transferencia`, `boleto`, `outro` |

## Padrao de auditoria e soft delete

Quase todas as tabelas compartilham o seguinte contrato:

| Campo | Funcao |
| --- | --- |
| `id` | UUID da entidade |
| `ativo` | Marca se o registro esta ativo |
| `data_criacao` | Data de criacao |
| `data_atualizacao` | Atualizado automaticamente pelo Prisma |
| `data_exclusao` | Soft delete logico |

## Entidades do dominio

### 1. Usuarios e autenticacao

| Tabela | Papel |
| --- | --- |
| `usuarios` | Cadastro de usuarios com perfil de acesso |
| `tokens_refresh` | Persistencia de refresh tokens rotativos |

Observacoes:

- `usuarios.email` e unico
- `tokens_refresh` guarda hash do refresh token, familia, origem e expiracao

### 2. Clientes

| Tabela | Papel |
| --- | --- |
| `clientes` | Pessoa fisica ou juridica |
| `contatos_cliente` | Contatos vinculados ao cliente |
| `enderecos_cliente` | Enderecos de coleta, entrega, cobranca etc. |
| `arquivos_cliente` | Arquivos enviados ao S3 e vinculados ao cliente |

Observacoes:

- `clientes.documento` e unico quando informado
- cada cliente pode possuir multiplos contatos e enderecos
- os arquivos guardam apenas `chave_s3` e `url_arquivo`

### 3. Catalogo de servicos

| Tabela | Papel |
| --- | --- |
| `servicos_catalogo` | Tabela mestre de servicos comercializados |

Observacoes:

- `preco_base` e `Decimal(12,2)`
- a ordem de servico congela snapshots do catalogo

### 4. Ordens de servico

| Tabela | Papel |
| --- | --- |
| `ordens_servico` | Cabecalho principal da OS |
| `itens_ordem_servico` | Itens fisicos da OS |
| `servicos_executados_item` | Servicos executados em cada item |
| `historicos_status_ordem_servico` | Auditoria de status |
| `imagens_ordem_servico` | Imagens adicionais da OS |

Campos relevantes em `ordens_servico`:

- `codigo`
- `status`
- `snapshot_cliente`
- `snapshot_endereco_coleta`
- `snapshot_endereco_entrega`
- `snapshot_politica_desconto`
- `percentual_desconto`
- `valor_desconto`
- `valor_frete`
- `valor_subtotal`
- `valor_total`
- `chave_assinatura_cliente`
- `url_assinatura_cliente`
- `chave_pdf`
- `url_pdf`

Observacoes:

- `snapshot_*` preserva contexto historico
- os valores financeiros usam `Decimal`
- `fatura` e relacao 1:1

### 5. Observacoes polimorficas

| Tabela | Papel |
| --- | --- |
| `observacoes` | Observacoes ligadas a ordem, item, cliente ou fatura |
| `imagens_observacao` | Imagens anexas a observacao |

Regras:

- `tipo_alvo` define qual FK deve ser usada
- no maximo 2 imagens por observacao
- `imagens_observacao` possui `unique(observacao_id, posicao)`

### 6. Faturas

| Tabela | Papel |
| --- | --- |
| `faturas` | Documento financeiro vinculado a uma OS |

Observacoes:

- `ordem_servico_id` e `unique`
- `numero` e `unique`
- `chave_pdf` e `url_pdf` preparam armazenamento futuro do PDF da fatura

## Relacionamentos mais importantes

```text
Usuario 1:N Cliente
Usuario 1:N OrdemServico
Usuario 1:N Fatura
Usuario 1:N Observacao

Cliente 1:N ContatoCliente
Cliente 1:N EnderecoCliente
Cliente 1:N ArquivoCliente
Cliente 1:N OrdemServico

OrdemServico 1:N ItemOrdemServico
ItemOrdemServico 1:N ServicoExecutadoItem
OrdemServico 1:N HistoricoStatusOrdemServico
OrdemServico 1:N Observacao
OrdemServico 1:N ImagemOrdemServico
OrdemServico 1:1 Fatura

Observacao 1:N ImagemObservacao
```

## Indexacao relevante

Exemplos de indices estrategicos:

- `usuarios(perfil, ativo)`
- `clientes(tipo_pessoa, ativo)`
- `servicos_catalogo(nome, ativo)`
- `ordens_servico(cliente_id, data_criacao)`
- `ordens_servico(status, agendada_coleta_em)`
- `historicos_status_ordem_servico(ordem_servico_id, data_criacao)`
- `faturas(status, vencimento_em)`

## Como ler os snapshots da ordem

Os snapshots guardam o estado no momento da operacao:

- `snapshot_cliente`: dados centrais do cliente
- `snapshot_endereco_coleta`: endereco usado na coleta
- `snapshot_endereco_entrega`: endereco usado na entrega
- `snapshot_politica_desconto`: limites do ambiente considerados naquela operacao

Isso evita que mudancas futuras em cliente, endereco ou politica alterem o historico de ordens passadas.

## Regras que o schema suporta diretamente

- Soft delete padronizado
- Auditoria basica por timestamps
- Historico de status
- Observacoes polimorficas
- Uma fatura por ordem
- Arquivos persistindo apenas metadados do S3

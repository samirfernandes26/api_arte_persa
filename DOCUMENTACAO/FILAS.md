# Filas BullMQ

## Visao geral

O projeto usa `BullMQ` com `Redis` para processamentos assíncronos e pesados.

Objetivos principais:

- geracao de PDF da ordem de servico
- otimizacao de imagens
- notificacoes preparatorias para evolucoes futuras

## Filas registradas

| Nome da fila | Constante | Finalidade |
| --- | --- | --- |
| `processamento-imagem` | `NOME_FILA_IMAGEM` | Redimensionamento, compressao e regravacao de imagens |
| `geracao-pdf-ordem-servico` | `NOME_FILA_PDF` | Geracao do PDF consolidado da ordem |
| `notificacoes` | `NOME_FILA_NOTIFICACAO` | Disparo ou preparo de notificacoes |

## Nomes das tarefas

| Tarefa | Constante |
| --- | --- |
| `otimizar-imagem` | `NOME_TAREFA_OTIMIZAR_IMAGEM` |
| `gerar-pdf-ordem-servico` | `NOME_TAREFA_GERAR_PDF` |
| `enviar-notificacao` | `NOME_TAREFA_ENVIAR_NOTIFICACAO` |

## Onde as filas sao usadas

| Fluxo | Comportamento |
| --- | --- |
| Criacao de ordem | Enfileira geracao de PDF |
| Atualizacao de ordem | Reenfileira PDF com estado novo |
| Mudanca de status da ordem | Enfileira notificacao e PDF |
| Criacao de fatura | Enfileira notificacao |
| Otimizacao de imagens | Disponivel via `FilasService` e `ProcessadorImagem` |

## Estrutura do servico de filas

Arquivo principal: [src/filas/filas.service.ts](../src/filas/filas.service.ts)

Metodos principais:

- `adicionarTarefaOtimizacaoImagem()`
- `adicionarTarefaGeracaoPdf()`
- `adicionarTarefaNotificacao()`
- `obterAdaptadoresBullBoard()`
- `obterSaudeRedis()`

## Payloads dos jobs

### 1. Geracao de PDF

Arquivo: [src/tarefas/tarefas-pdf.ts](../src/tarefas/tarefas-pdf.ts)

Campos principais:

- `ordem_servico_id`
- `codigo_ordem_servico`
- `nome_cliente`
- `status`
- `chave_arquivo`
- `observacoes`
- `valor_subtotal`
- `valor_desconto`
- `valor_total`
- `itens`

Resultado:

- `chave`
- `url`
- `paginas`
- `gerado_em`

### 2. Otimizacao de imagem

Arquivo: [src/tarefas/tarefas-imagem.ts](../src/tarefas/tarefas-imagem.ts)

Campos principais:

- `ordem_servico_id`
- `chave_origem`
- `chave_destino`
- `formato`
- `qualidade`
- `largura_maxima`
- `altura_maxima`
- `apagar_origem_apos_processamento`

Resultado:

- `chave`
- `url`
- `tipo_conteudo`
- `tamanho_bytes`
- `processado_em`

### 3. Notificacoes

Arquivo: [src/tarefas/tarefas-notificacao.ts](../src/tarefas/tarefas-notificacao.ts)

Campos principais:

- `canal`
- `tipo`
- `destinatario`
- `assunto`
- `mensagem`
- `metadados`

Resultado:

- `entregue`
- `processado_em`

## Processadores

| Arquivo | Responsabilidade |
| --- | --- |
| [processador-imagem.ts](../src/processadores/processador-imagem.ts) | Le objeto no S3, otimiza com Sharp e reenfileira resultado no S3 |
| [processador-pdf.ts](../src/processadores/processador-pdf.ts) | Monta PDF com `pdf-lib`, envia ao S3 e grava `chave_pdf` e `url_pdf` na ordem |
| [processador-notificacao.ts](../src/processadores/processador-notificacao.ts) | Stub de notificacao, pronto para futura integracao externa |

## Politica de retry e limpeza

Definida em `FilasModule` com base no ambiente:

| Configuracao | Uso |
| --- | --- |
| `BULLMQ_PREFIXO` | Prefixo compartilhado das filas |
| `BULLMQ_REMOVER_CONCLUIDOS_SEGUNDOS` | TTL de jobs concluidos |
| `BULLMQ_REMOVER_FALHAS_SEGUNDOS` | TTL de jobs com falha |
| `CONCORRENCIA_FILA_IMAGEM` | Paralelismo do worker de imagem |
| `CONCORRENCIA_FILA_PDF` | Paralelismo do worker de PDF |
| `CONCORRENCIA_FILA_NOTIFICACAO` | Paralelismo do worker de notificacao |

Padrao de tentativas:

- imagem: `3`
- PDF: `3`
- notificacao: `5`

## Bull Board

Configuracao: [src/filas/configurar-painel-filas.ts](../src/filas/configurar-painel-filas.ts)

### URL padrao

```text
/admin/filas
```

### Autorizacao

- exige header `Authorization: Bearer <access_token>`
- perfis permitidos por padrao: `supervisor`, `master`
- configuravel por `PERFIS_BULL_BOARD`

### Respostas de erro do painel

- `401`: token ausente ou invalido
- `403`: perfil sem acesso

## Observacoes operacionais

- O Redis usado pelas filas e o mesmo Redis configurado para o projeto
- Workers e filas usam o mesmo `prefix`
- No desligamento da aplicacao, filas, workers e conexoes Redis sao encerrados explicitamente

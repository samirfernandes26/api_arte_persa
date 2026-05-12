# Documentacao da API de Ordens de Servico

## Visao geral

Esta documentacao cobre a API NestJS para gerenciamento de ordens de servico de uma empresa de limpeza, higienizacao e manutencao de tapetes persas, estofados e itens correlatos.

A aplicacao foi estruturada com:

- `NestJS 11` com `TypeScript` em modo estrito
- `Prisma` sobre `MySQL 8`
- `JWT + Refresh Token`
- `BullMQ + Redis`
- `AWS S3` com URLs pre-assinadas
- `Jest + Supertest + Testcontainers`

## Indice da documentacao

| Arquivo | Objetivo |
| --- | --- |
| [API.md](./API.md) | Rotas HTTP, autenticacao, niveis de acesso e exemplos de request/response |
| [DATABASE.md](./DATABASE.md) | Explicacao do schema Prisma, relacionamentos, enums e auditoria |
| [DTOs.md](./DTOs.md) | DTOs principais, validacoes e exemplos de uso |
| [FILAS.md](./FILAS.md) | Filas BullMQ, jobs, processors e Bull Board |
| [SEGURANCA.md](./SEGURANCA.md) | Criptografia, KMS, hardening HTTP e controles de seguranca |
| [S3.md](./S3.md) | Estrategia de armazenamento em S3 e fluxo de upload |
| [TESTES.md](./TESTES.md) | Testes unitarios, integracao e e2e |
| [EXEMPLOS](./EXEMPLOS) | Payloads, responses e erros de referencia |

## Stack do projeto

| Camada | Tecnologia |
| --- | --- |
| API | NestJS |
| Linguagem | TypeScript |
| Banco relacional | MySQL 8 |
| ORM | Prisma |
| Cache e filas | Redis + BullMQ |
| Armazenamento de arquivos | AWS S3 |
| Seguranca | JWT, token de atualizacao, guards por perfil |
| Validacao | class-validator, class-transformer, Zod |
| Testes | Jest, Supertest, Testcontainers |

## Estrutura principal do projeto

```text
src/
├── autenticacao/
├── clientes/
├── comum/
├── configuracao/
├── faturas/
├── filas/
├── itens/
├── kms/
├── observacoes/
├── ordens-servico/
├── prisma/
├── processadores/
├── s3/
├── servicos/
├── tarefas/
├── uploads/
└── usuarios/
```

## Pre-requisitos

- Docker e Docker Compose
- Node.js 22 ou superior
- npm 10 ou superior
- Conta AWS com bucket S3 configurado

## Variaveis de ambiente

1. Copie o exemplo:

```bash
cp .env.example .env
```

2. Ajuste as chaves mais importantes:

- `URL_BANCO_DADOS`
- `JWT_SEGREDO_ACESSO`
- `JWT_SEGREDO_REFRESH`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_KMS_KEY_ID`
- `S3_BUCKET_NAME`
- `USE_KMS_ENCRYPTION`
- `S3_USE_KMS`

### Grupos principais

| Grupo | Variaveis |
| --- | --- |
| Aplicacao | `NODE_ENV`, `NOME_APLICACAO`, `PORTA_APLICACAO`, `PREFIXO_GLOBAL_API` |
| Banco | `URL_BANCO_DADOS`, `MYSQL_*` |
| Redis | `REDIS_*` |
| JWT | `JWT_SEGREDO_ACESSO`, `JWT_TEMPO_ACESSO`, `JWT_SEGREDO_REFRESH`, `JWT_TEMPO_REFRESH` |
| S3 e KMS | `AWS_*`, `AWS_KMS_KEY_ID`, `S3_BUCKET_NAME`, `S3_PUBLIC_BASE_URL`, `S3_USE_KMS`, `USE_KMS_ENCRYPTION`, `CRIPTOGRAFIA_*`, `S3_UPLOAD_URL_EXPIRES_IN`, `S3_GET_URL_EXPIRES_IN` |
| Filas | `BULLMQ_PREFIXO`, `CONCORRENCIA_FILA_*`, `CAMINHO_BULL_BOARD`, `PERFIS_BULL_BOARD` |
| Regras de negocio | `DESCONTO_MAXIMO_FUNCIONARIO`, `DESCONTO_MAXIMO_SUPERVISOR`, `DESCONTO_MAXIMO_MASTER` |

Consulte o arquivo [.env.example](../.env.example) para a lista completa.

## Como subir com Docker Compose

### Ambiente padrao

```bash
docker compose up --build
```

O container da aplicacao executa automaticamente:

1. `npm run prisma:generate`
2. `npm run start:dev`

Antes de usar a API pela primeira vez, aplique o schema no banco manualmente.

### Ambiente com phpMyAdmin

```bash
docker compose --profile ferramentas up --build
```

Servicos disponiveis:

- API: `http://localhost:3000/api`
- Bull Board: `http://localhost:3000/admin/filas`
- phpMyAdmin: `http://localhost:8080`
- MySQL: `localhost:3306`
- Redis: `localhost:6379`

## Banco de dados e Prisma

### Gerar client Prisma

```bash
npm run prisma:generate
```

### Aplicar schema no banco pela primeira vez

Enquanto a base ainda nao possui historico versionado de migrations, use:

```bash
npm run prisma:push
```

### Criar migrations futuras

```bash
npm run prisma:migrate:dev
```

### Abrir Prisma Studio

```bash
npm run prisma:studio
```

## Como iniciar sem Docker

Se voce quiser executar a API fora do container, garanta MySQL e Redis em execucao e rode:

```bash
npm ci
npm run prisma:generate
npm run prisma:push
npm run start:dev
```

## Fluxo inicial recomendado

1. Suba a infraestrutura com `docker compose up --build`
2. Aplique o schema com `npm run prisma:push` ou rode a migration apropriada
3. Crie o primeiro usuario master com `POST /api/usuarios/primeiro-master`
4. Faça login em `POST /api/autenticacao/entrar`
5. Cadastre servicos, clientes e ordens de servico

## Autenticacao e niveis de acesso

### Perfis suportados

| Perfil | Uso |
| --- | --- |
| `funcionario` | Operacao do dia a dia, cadastro e acompanhamento |
| `supervisor` | Gestao intermediaria, aprovacao parcial de desconto, servicos, faturas |
| `master` | Administracao completa do sistema |

### Regras gerais

- Quase todas as rotas exigem `Authorization: Bearer <token_acesso>`
- Rotas publicas:
  - `POST /api/usuarios/primeiro-master`
  - `POST /api/autenticacao/entrar`
  - `POST /api/autenticacao/renovar-token`
  - `POST /api/autenticacao/sair`
- O Bull Board tambem e protegido por JWT de acesso

## Regras de negocio importantes

### Descontos por perfil

Os limites saem do ambiente:

- `funcionario`: `DESCONTO_MAXIMO_FUNCIONARIO` default `10`
- `supervisor`: `DESCONTO_MAXIMO_SUPERVISOR` default `20`
- `master`: `DESCONTO_MAXIMO_MASTER` default `100`

Se o solicitante ultrapassar o proprio limite, a API exige um `aprovado_por_desconto_id` com perfil capaz de autorizar aquele percentual.

### Workflow da ordem de servico

Estados suportados:

1. `aberta`
2. `aguardando_coleta`
3. `coletada`
4. `em_higienizacao`
5. `em_manutencao`
6. `controle_qualidade`
7. `pronta_para_entrega`
8. `entregue`
9. `cancelada`

Toda mudanca valida gera registro em `historicos_status_ordem_servico`.

### Congelamento de preco

Ao criar ou atualizar uma ordem:

- o valor do servico de catalogo e copiado para `servicos_executados_item`
- o nome do servico, unidade de cobranca e categoria tambem sao congelados
- alterar o catalogo depois nao muda ordens ja criadas

### Auditoria

As entidades principais utilizam:

- `id`
- `ativo`
- `data_criacao`
- `data_atualizacao`
- `data_exclusao`

Varios modulos tambem registram `criado_por_id` e `atualizado_por_id`.

## Uploads e S3

O frontend deve:

1. pedir uma URL pre-assinada em `POST /api/uploads/url-pre-assinada`
2. fazer `PUT` direto no S3
3. confirmar o upload em uma rota de confirmacao apropriada ou no modulo de dominio correspondente

Toda URL pre-assinada gera uma `intencao_upload` persistida no banco. A confirmacao valida:

- prefixo da chave
- entidade dona do upload
- existencia real do objeto no S3
- tipo MIME
- tamanho do arquivo, quando informado

Pastas principais no bucket:

- `ordens/{ordemId}/itens/{itemId}`
- `ordens/{ordemId}/observacoes`
- `ordens/{ordemId}/imagens-adicionais`
- `ordens/{ordemId}/assinaturas`
- `ordens/{ordemId}/documentos`
- `clientes/{clienteId}/arquivos`
- `faturas/{faturaId}/pdf`

## Seguranca e criptografia

- Uploads no S3 usam criptografia server-side com `SSE-KMS` por padrao
- O projeto suporta fallback para `AES256` no S3 via configuracao
- Campos sensiveis no banco usam envelope encryption em nivel de aplicacao
- `clientes.documento` usa hash deterministico para busca exata e unicidade
- Consulte [S3.md](./S3.md) e [SEGURANCA.md](./SEGURANCA.md) para a politica completa

Detalhes completos em [S3.md](./S3.md).

## Filas e processamento assíncrono

Filas registradas:

- `processamento-imagem`
- `geracao-pdf-ordem-servico`
- `notificacoes`

O Bull Board fica em `/admin/filas` e exige token JWT com perfil permitido.

Detalhes em [FILAS.md](./FILAS.md).

## Testes

Scripts principais:

```bash
npm test
npm run test:integration
npm run test:e2e
npm run test:cobertura
```

Os testes de integracao e e2e usam Testcontainers para subir MySQL e Redis isolados.

Detalhes em [TESTES.md](./TESTES.md).

## Exemplos prontos

Payloads de referencia:

- [criar-cliente-completo.json](./EXEMPLOS/payloads/criar-cliente-completo.json)
- [criar-ordem-servico-completa.json](./EXEMPLOS/payloads/criar-ordem-servico-completa.json)
- [atualizar-status-os.json](./EXEMPLOS/payloads/atualizar-status-os.json)
- [login.json](./EXEMPLOS/payloads/login.json)
- [gerar-presigned-url.json](./EXEMPLOS/payloads/gerar-presigned-url.json)
- [adicionar-observacao.json](./EXEMPLOS/payloads/adicionar-observacao.json)

Responses e erros:

- [responses](./EXEMPLOS/responses)
- [errors](./EXEMPLOS/errors)

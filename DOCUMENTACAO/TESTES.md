# Testes

## Visao geral

O projeto possui tres camadas principais de validacao:

- testes unitarios
- testes de integracao
- testes e2e

## Scripts disponiveis

| Comando | Objetivo |
| --- | --- |
| `npm test` | Suite padrao de unitarios |
| `npm run test:cobertura` | Cobertura de testes unitarios |
| `npm run test:integration` | Integracao e e2e com `test/jest-e2e.json` |
| `npm run test:e2e` | Alias operacional da mesma suite de integracao/e2e |

## Estrutura

```text
test/
├── configuracao/
│   ├── ambiente-integracao.ts
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── setup-env.ts
├── e2e/
│   └── saude.e2e-spec.ts
├── integration/
│   ├── apoio/
│   ├── autenticacao/
│   ├── clientes/
│   ├── factories/
│   ├── filas/
│   ├── ordens-servico/
│   └── uploads/
└── jest-e2e.json
```

## Testes unitarios relevantes

Arquivos:

- [src/comum/utilitarios/desconto.util.spec.ts](../src/comum/utilitarios/desconto.util.spec.ts)
- [src/comum/utilitarios/status-ordem-servico.util.spec.ts](../src/comum/utilitarios/status-ordem-servico.util.spec.ts)
- [src/uploads/uploads.service.spec.ts](../src/uploads/uploads.service.spec.ts)

## Testes de integracao obrigatorios implementados

| Suite | Cobertura |
| --- | --- |
| `autenticacao.integration-spec.ts` | login, token de atualizacao, 401 e 403 |
| `clientes.integration-spec.ts` | criacao aninhada, validacao e busca |
| `ordens-servico.integration-spec.ts` | criacao completa, desconto, historico e congelamento de preco |
| `uploads.integration-spec.ts` | presigned URL e confirmacao de upload |
| `filas.integration-spec.ts` | enfileiramento de PDF e persistencia do resultado |
| `saude.e2e-spec.ts` | endpoint publico de saude |

## Infraestrutura dos testes de integracao

### Banco e Redis isolados

Os testes usam `testcontainers` para subir:

- `mysql:8.0`
- `redis`

Isso significa:

- os testes nao dependem do `docker compose up`
- cada execucao cria ambiente isolado
- `globalSetup` aplica `prisma db push`

## Factories

Factories usadas para manter cenarios legiveis:

- `usuario.factory.ts`
- `cliente.factory.ts`
- `servico.factory.ts`
- `ordem-servico.factory.ts`

## Boas praticas adotadas

- `beforeAll` para bootstrap da aplicacao
- `beforeEach` para limpeza de banco e filas
- `afterEach` para aguardar filas ficarem ociosas
- `afterAll` para fechamento controlado da aplicacao
- S3 falso em memoria para integracao

## Como rodar localmente

### Unitarios

```bash
npm test
```

### Integracao e e2e

```bash
npm run test:integration
```

Ou:

```bash
npm run test:e2e
```

### Com diagnostico de handles abertos

```bash
npx jest --config ./test/jest-e2e.json --runInBand --detectOpenHandles
```

## Observacoes importantes

- Docker precisa estar ativo para os testes de integracao
- os testes de integracao fazem `prisma generate` automaticamente
- o banco e limpo entre cenarios
- as filas BullMQ sao esvaziadas entre testes

## Como adicionar novos testes

1. Crie uma factory se o payload for reaproveitavel
2. Reuse `criarAplicacaoIntegracao()`
3. Limpe banco e filas no `beforeEach`
4. Prefira assercoes de regra de negocio, nao so status code
5. Se houver S3 no fluxo, use `S3FalsoMemoria`

# Documentacao da API

## Convencoes gerais

- Prefixo global: `/api`
- Formato: `application/json`
- Autenticacao: `Authorization: Bearer <token_acesso>`
- Datas: `ISO 8601`
- Campos `Decimal` do Prisma costumam ser serializados em JSON como `string`
- Validacao global:
  - `whitelist: true`
  - `transform: true`
  - `forbidNonWhitelisted: true`

## Headers padrao

| Header | Obrigatorio | Observacao |
| --- | --- | --- |
| `Content-Type: application/json` | Sim, quando houver body | Todas as rotas POST/PATCH |
| `Authorization: Bearer <token>` | Sim, exceto rotas publicas | Token de acesso JWT |

## Perfis de acesso

| Perfil | Escopo resumido |
| --- | --- |
| `funcionario` | Clientes, ordens, observacoes, uploads operacionais |
| `supervisor` | Tudo do funcionario + servicos, faturas, imagens adicionais e Bull Board |
| `master` | Acesso total, inclusive criacao e edicao de usuarios |

## Rotas publicas

| Metodo | Rota | Descricao | Body | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/usuarios/primeiro-master` | Cria o primeiro usuario `master` do sistema vazio | Mesmo formato de `CriarUsuarioDto` | Usuario criado |
| `POST` | `/api/autenticacao/entrar` | Autentica usuario e devolve `token_acesso` e `token_atualizacao` | [login.json](./EXEMPLOS/payloads/login.json) | [login-sucesso.json](./EXEMPLOS/responses/login-sucesso.json) |
| `POST` | `/api/autenticacao/renovar-token` | Renova o par de tokens | Mesmo contrato de `TokenAtualizacaoDto` | [login-sucesso.json](./EXEMPLOS/responses/login-sucesso.json) |
| `POST` | `/api/autenticacao/sair` | Revoga token de atualizacao | `{ "token_atualizacao": "..." }` | `{ "mensagem": "Saida concluida." }` |

## 1. Autenticacao

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/autenticacao/eu` | Todos autenticados | `Authorization` | Sem body | Usuario autenticado |

### Exemplo detalhado: login

```http
POST /api/autenticacao/entrar
Content-Type: application/json
```

```json
{
  "email": "master@artepersa.com.br",
  "senha": "SenhaSegura@123"
}
```

Response de referencia: [login-sucesso.json](./EXEMPLOS/responses/login-sucesso.json)

## 2. Usuarios

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/usuarios` | `master` | `Authorization` | `CriarUsuarioDto` | Usuario criado |
| `GET` | `/api/usuarios` | `master`, `supervisor` | `Authorization` | Sem body | Lista de usuarios |
| `GET` | `/api/usuarios/:id` | `master`, `supervisor` | `Authorization` | Sem body | Usuario detalhado |
| `PATCH` | `/api/usuarios/:id` | `master` | `Authorization` | `AtualizarUsuarioDto` | Usuario atualizado |

### Campos centrais

- `nome`
- `email`
- `senha`
- `perfil`
- `ativo`

## 3. Clientes

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/clientes` | `funcionario`, `supervisor`, `master` | `Authorization` | [criar-cliente-completo.json](./EXEMPLOS/payloads/criar-cliente-completo.json) | [cliente-criado.json](./EXEMPLOS/responses/cliente-criado.json) |
| `GET` | `/api/clientes` | `funcionario`, `supervisor`, `master` | `Authorization` | Query `pagina`, `limite`, `busca` | Lista paginada simples |
| `GET` | `/api/clientes/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Cliente com contatos, enderecos e arquivos |
| `PATCH` | `/api/clientes/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | `AtualizarClienteDto` | Cliente atualizado |

### Observacoes de negocio

- Atualizar cliente com `contatos` ou `enderecos` substitui os registros ativos anteriores
- O modulo aceita estruturas aninhadas
- O campo `busca` procura por nome, fantasia/apelido e documento em modo exato por hash seguro

### Exemplo detalhado: criar cliente

Request: [criar-cliente-completo.json](./EXEMPLOS/payloads/criar-cliente-completo.json)

Response: [cliente-criado.json](./EXEMPLOS/responses/cliente-criado.json)

## 4. Servicos de catalogo

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/servicos` | `supervisor`, `master` | `Authorization` | `CriarServicoDto` | Servico criado |
| `GET` | `/api/servicos` | `funcionario`, `supervisor`, `master` | `Authorization` | Query `pagina`, `limite`, `busca` | Lista de servicos |
| `GET` | `/api/servicos/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Servico detalhado |
| `PATCH` | `/api/servicos/:id` | `supervisor`, `master` | `Authorization` | `AtualizarServicoDto` | Servico atualizado |

### Campos relevantes

- `nome`
- `descricao`
- `categoria`
- `preco_base`
- `unidade_cobranca`
- `prazo_medio_dias`

## 5. Ordens de servico

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/ordens-servico` | `funcionario`, `supervisor`, `master` | `Authorization` | [criar-ordem-servico-completa.json](./EXEMPLOS/payloads/criar-ordem-servico-completa.json) | [ordem-servico-detalhe.json](./EXEMPLOS/responses/ordem-servico-detalhe.json) |
| `GET` | `/api/ordens-servico` | `funcionario`, `supervisor`, `master` | `Authorization` | Query `pagina`, `limite`, `busca`, `status`, `cliente_id` | Lista de ordens |
| `GET` | `/api/ordens-servico/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | [ordem-servico-detalhe.json](./EXEMPLOS/responses/ordem-servico-detalhe.json) |
| `PATCH` | `/api/ordens-servico/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | `AtualizarOrdemServicoDto` | Ordem atualizada |
| `PATCH` | `/api/ordens-servico/:id/status` | `funcionario`, `supervisor`, `master` | `Authorization` | [atualizar-status-os.json](./EXEMPLOS/payloads/atualizar-status-os.json) | Ordem com historico atualizado |
| `POST` | `/api/ordens-servico/:id/gerar-pdf` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | `{ "mensagem": "Geracao de PDF solicitada com sucesso." }` |

### Regras importantes

- Cada ordem precisa ter pelo menos um item
- Cada item precisa ter pelo menos um servico executado
- O desconto do servico nao pode superar o valor bruto daquele servico
- Desconto percentual acima do limite do solicitante exige aprovador
- Ao criar/atualizar, o catalogo e congelado em `servicos_executados_item`
- Mudancas de status geram historico automatico e notificacao

### Exemplo detalhado: criar ordem completa

Request: [criar-ordem-servico-completa.json](./EXEMPLOS/payloads/criar-ordem-servico-completa.json)

Response: [ordem-servico-detalhe.json](./EXEMPLOS/responses/ordem-servico-detalhe.json)

### Matriz de status permitidos

| Status atual | Proximos status validos |
| --- | --- |
| `aberta` | `aguardando_coleta`, `cancelada` |
| `aguardando_coleta` | `coletada`, `cancelada` |
| `coletada` | `em_higienizacao`, `cancelada` |
| `em_higienizacao` | `em_manutencao`, `controle_qualidade`, `cancelada` |
| `em_manutencao` | `controle_qualidade`, `cancelada` |
| `controle_qualidade` | `pronta_para_entrega`, `em_manutencao`, `cancelada` |
| `pronta_para_entrega` | `entregue`, `cancelada` |
| `entregue` | Nenhum |
| `cancelada` | Nenhum |

## 6. Itens

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `GET` | `/api/itens/ordem-servico/:ordemServicoId` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Itens ativos da ordem |
| `GET` | `/api/itens/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Item detalhado |
| `PATCH` | `/api/itens/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | `AtualizarItemOrdemServicoDto` | Item atualizado |

## 7. Observacoes

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/observacoes` | `funcionario`, `supervisor`, `master` | `Authorization` | [adicionar-observacao.json](./EXEMPLOS/payloads/adicionar-observacao.json) | Observacao criada |
| `GET` | `/api/observacoes/ordens-servico/:ordemServicoId` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Lista de observacoes da ordem |
| `GET` | `/api/observacoes/itens/:itemId` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Lista de observacoes do item |
| `GET` | `/api/observacoes/clientes/:clienteId` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Lista de observacoes do cliente |
| `GET` | `/api/observacoes/faturas/:faturaId` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Lista de observacoes da fatura |
| `GET` | `/api/observacoes/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Observacao detalhada |

### Regras importantes

- Observacoes sao polimorficas
- No maximo 2 imagens por observacao
- `tipo_alvo` define qual identificador deve ser enviado

## 8. Uploads

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/uploads/url-pre-assinada` | `funcionario`, `supervisor`, `master` | `Authorization` | [gerar-presigned-url.json](./EXEMPLOS/payloads/gerar-presigned-url.json) | [presigned-url-sucesso.json](./EXEMPLOS/responses/presigned-url-sucesso.json) |
| `POST` | `/api/uploads/confirmacoes/imagem-ordem` | `supervisor`, `master` | `Authorization` | `ConfirmarImagemOrdemServicoDto` | Imagem adicional criada |
| `POST` | `/api/uploads/confirmacoes/arquivo-cliente` | `funcionario`, `supervisor`, `master` | `Authorization` | `ConfirmarArquivoClienteDto` | Arquivo do cliente criado |
| `POST` | `/api/uploads/confirmacoes/assinatura-ordem` | `funcionario`, `supervisor`, `master` | `Authorization` | `ConfirmarAssinaturaOrdemServicoDto` | Ordem com assinatura registrada |
| `GET` | `/api/uploads/cors-s3` | `supervisor`, `master` | `Authorization` | Sem body | Exemplo de configuracao CORS para bucket |

### Fluxo recomendado

1. Solicitar URL pre-assinada
2. Fazer upload `PUT` direto no S3
3. Confirmar a persistencia no modulo apropriado

Observacao:

- quando `S3_USE_KMS=true`, a resposta da URL pre-assinada devolve os cabecalhos `x-amz-server-side-encryption` e `x-amz-server-side-encryption-aws-kms-key-id`
- cada URL pre-assinada registra uma `intencao_upload`; a confirmacao falha se a chave nao existir no S3, estiver fora do prefixo ou nao corresponder a entidade esperada
- os payloads de confirmacao e de dominio enviam apenas `chave_s3`; a API recalcula internamente a URL publica correspondente

## 9. Faturas

| Metodo | Rota | Perfis | Headers | Request | Response |
| --- | --- | --- | --- | --- | --- |
| `POST` | `/api/faturas` | `supervisor`, `master` | `Authorization` | `CriarFaturaDto` | Fatura criada |
| `GET` | `/api/faturas` | `funcionario`, `supervisor`, `master` | `Authorization` | Query `pagina`, `limite`, `busca`, `status`, `ordem_servico_id` | Lista de faturas |
| `GET` | `/api/faturas/:id` | `funcionario`, `supervisor`, `master` | `Authorization` | Sem body | Fatura detalhada |
| `PATCH` | `/api/faturas/:id/status` | `supervisor`, `master` | `Authorization` | `AtualizarStatusFaturaDto` | Fatura atualizada |

### Regras importantes

- Cada ordem de servico pode ter somente uma fatura
- O numero da fatura e gerado automaticamente se nao for enviado
- Criacao de fatura tambem dispara notificacao assíncrona

## 10. Healthcheck

| Metodo | Rota | Perfis | Headers | Descricao |
| --- | --- | --- | --- | --- |
| `GET` | `/api/saude` | Publica | Nenhum | Retorna status da aplicacao e nome configurado |

## Respostas de erro mais comuns

| Cenario | Status | Exemplo |
| --- | --- | --- |
| Token ausente ou invalido | `401` | [erro-nao-autenticado.json](./EXEMPLOS/errors/erro-nao-autenticado.json) |
| Perfil sem permissao | `403` | [erro-perfil-sem-acesso.json](./EXEMPLOS/errors/erro-perfil-sem-acesso.json) |
| Desconto acima do limite | `403` | [erro-desconto-sem-aprovacao.json](./EXEMPLOS/errors/erro-desconto-sem-aprovacao.json) |
| Validacao de payload | `400` | [erro-validacao-cliente.json](./EXEMPLOS/errors/erro-validacao-cliente.json) |
| Transicao de status invalida | `400` | [erro-status-invalido.json](./EXEMPLOS/errors/erro-status-invalido.json) |
| Recurso nao encontrado | `404` | Corpo padrao do NestJS com mensagem especifica do modulo |

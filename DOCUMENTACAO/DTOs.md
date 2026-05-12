# DTOs principais

## Visao geral

Os DTOs foram construidos com:

- `class-validator`
- `class-transformer`
- `PartialType` do NestJS para atualizacoes

O projeto tambem usa `Zod` para validacao de ambiente em `src/configuracao/esquema-ambiente.ts`.

## DTOs destacados

| DTO | Modulo | Objetivo | Exemplo |
| --- | --- | --- | --- |
| `EntrarDto` | autenticacao | Login com email e senha | [login.json](./EXEMPLOS/payloads/login.json) |
| `TokenAtualizacaoDto` | autenticacao | Renovacao e logout | Corpo simples com `token_atualizacao` |
| `CriarUsuarioDto` | usuarios | Criacao de usuario | Campos `nome`, `email`, `senha`, `perfil` |
| `CriarClienteDto` | clientes | Cliente com contatos e enderecos aninhados | [criar-cliente-completo.json](./EXEMPLOS/payloads/criar-cliente-completo.json) |
| `CriarServicoDto` | servicos | Cadastro de servico de catalogo | Ver modulo de servicos |
| `CriarOrdemServicoDto` | ordens-servico | Ordem completa com itens e servicos executados | [criar-ordem-servico-completa.json](./EXEMPLOS/payloads/criar-ordem-servico-completa.json) |
| `AtualizarStatusOrdemServicoDto` | ordens-servico | Troca controlada de status | [atualizar-status-os.json](./EXEMPLOS/payloads/atualizar-status-os.json) |
| `AdicionarObservacaoDto` | observacoes | Observacao polimorfica com ate 2 imagens | [adicionar-observacao.json](./EXEMPLOS/payloads/adicionar-observacao.json) |
| `GerarUrlPreAssinadaDto` | uploads | Definicao do destino e tipo do upload | [gerar-presigned-url.json](./EXEMPLOS/payloads/gerar-presigned-url.json) |
| `CriarFaturaDto` | faturas | Criacao de fatura da ordem | Ver modulo de faturas |

## 1. EntrarDto

Campos:

- `email`: precisa ser e-mail valido
- `senha`: minimo de 8 caracteres

Uso:

- `POST /api/autenticacao/entrar`

## 2. CriarUsuarioDto

Campos:

- `nome`
- `email`
- `senha`
- `perfil` opcional

Validacoes relevantes:

- trim e lowercase em campos textuais importantes
- senha minima de 8 caracteres
- `perfil` restrito ao enum

## 3. CriarClienteDto

### Subestruturas

| DTO aninhado | Uso |
| --- | --- |
| `CriarContatoClienteDto` | Contatos do cliente |
| `CriarEnderecoClienteDto` | Enderecos do cliente |

### Regras relevantes

- `contatos`: maximo de 10
- `enderecos`: maximo de 10
- `estado`: exatamente 2 caracteres
- `cep`: regex brasileira simples
- `tipo_pessoa`, `tipo_contato` e `tipo_endereco` amarrados em enum

## 4. CriarOrdemServicoDto

### Estruturas internas

| DTO aninhado | Papel |
| --- | --- |
| `CriarItemOrdemServicoDto` | Cada item fisico da OS |
| `CriarServicoExecutadoItemDto` | Servicos realizados naquele item |

### Regras relevantes

- `itens`: minimo 1, maximo 50
- `servicos_executados`: minimo 1, maximo 15 por item
- `percentual_desconto`: entre 0 e 100 no DTO
- a validacao real por perfil e feita no service
- snapshots de endereco aceitam objetos livres

## 5. AtualizarStatusOrdemServicoDto

Campos:

- `status`
- `motivo` opcional

Uso:

- `PATCH /api/ordens-servico/:id/status`

Observacao:

- a transicao permitida e validada no utilitario de status

## 6. AdicionarObservacaoDto

Campos principais:

- `tipo_alvo`
- `ordem_servico_id`, `item_ordem_servico_id`, `cliente_id` ou `fatura_id`
- `visibilidade`
- `titulo`
- `conteudo`
- `imagens`

Regras:

- maximo de 2 imagens
- cada imagem informa `chave_s3`, `nome_arquivo`, `tipo_mime`, `tamanho_bytes`, `posicao`

## 7. GerarUrlPreAssinadaDto

Campos:

- `tipo_destino`
- `ordem_servico_id`
- `item_ordem_servico_id`
- `observacao_id`
- `cliente_id`
- `fatura_id`
- `nome_arquivo`
- `tipo_mime`

Regras:

- `tipo_mime` precisa casar com regex MIME
- o `tipo_destino` define quais IDs sao obrigatorios

## 8. DTOs de confirmacao de upload

| DTO | Objetivo |
| --- | --- |
| `ConfirmarImagemOrdemServicoDto` | Persistir imagem adicional de ordem |
| `ConfirmarArquivoClienteDto` | Persistir arquivo de cliente |
| `ConfirmarAssinaturaOrdemServicoDto` | Persistir assinatura do cliente |

Campos recorrentes:

- `chave_s3`
- `nome_arquivo`
- `tipo_mime`
- `tamanho_bytes`

Observacao:

- os DTOs de confirmacao nao aceitam `url_arquivo`; a URL e sempre recalculada pelo backend a partir de `chave_s3`

## 9. DTOs de consulta

| DTO | Campos |
| --- | --- |
| `PaginacaoConsultaDto` | `pagina`, `limite`, `busca` |
| `ConsultarOrdensServicoDto` | `pagina`, `limite`, `busca`, `status`, `cliente_id` |
| `ConsultarFaturasDto` | `pagina`, `limite`, `busca`, `status`, `ordem_servico_id` |

## 10. Atualizacoes parciais

Os DTOs abaixo usam `PartialType`, portanto herdam todas as validacoes do DTO de criacao, mas tornam os campos opcionais:

- `AtualizarClienteDto`
- `AtualizarOrdemServicoDto`
- `AtualizarServicoDto`
- `AtualizarUsuarioDto`

## Dicas para frontend e integracoes

- Envie sempre `application/json`
- Em campos monetarios, prefira duas casas decimais
- Para uploads, gere a URL pre-assinada antes de enviar o arquivo
- Guarde os IDs retornados na criacao de cliente, ordem, item e fatura para fluxos seguintes

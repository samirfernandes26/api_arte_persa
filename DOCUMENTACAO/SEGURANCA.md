# Seguranca e Criptografia

## Visao geral

O projeto aplica seguranca em camadas:

- `JWT + Refresh Token` com rotacao
- `Helmet`, `CORS` explicito e `Throttler`
- `Bull Board` protegido por autenticacao e perfil
- `SSE-KMS` para objetos do S3
- `Envelope Encryption` para campos sensiveis no MySQL

## KMS e envelope encryption

Arquivo principal: [src/kms/kms.service.ts](../src/kms/kms.service.ts)

O `KmsService` suporta dois modos:

1. `USE_KMS_ENCRYPTION=true`
   - usa `AWS KMS GenerateDataKey`
   - criptografa o dado com `AES-256-GCM`
   - persiste a data key cifrada junto do pacote

2. `USE_KMS_ENCRYPTION=false`
   - usa uma chave local de fallback
   - mantem o modelo de envelope encryption
   - ideal para testes automatizados e ambientes sem KMS

## Campos sensiveis protegidos

### Clientes

- `documento`
- `email_principal`
- `telefone_principal`
- `observacoes_internas`
- `contatos_cliente.valor`

### Ordens de servico

- `motivo_desconto`
- `observacoes_internas`
- `observacoes_cliente`
- `snapshot_cliente`
- `snapshot_endereco_coleta`
- `snapshot_endereco_entrega`

## Busca e unicidade de documento

Como `clientes.documento` fica criptografado, a aplicacao usa `clientes.documento_hash` para:

- garantir unicidade
- permitir busca exata por CPF/CNPJ normalizado

Essa hash e gerada via `HMAC-SHA256`, usando `CRIPTOGRAFIA_HASH_SEGREDO`.

## S3 com SSE-KMS

Arquivo principal: [src/s3/s3.service.ts](../src/s3/s3.service.ts)

Uploads server-side e URLs pre-assinadas aplicam:

- `ServerSideEncryption: aws:kms`
- `SSEKMSKeyId: AWS_KMS_KEY_ID`

Se `S3_USE_KMS=false`, o projeto usa:

- `ServerSideEncryption: AES256`

## Variaveis de ambiente de seguranca

| Variavel | Papel |
| --- | --- |
| `AWS_KMS_KEY_ID` | ARN da CMK usada pelo KMS e pelo S3 |
| `USE_KMS_ENCRYPTION` | Liga a criptografia de aplicacao com KMS |
| `CRIPTOGRAFIA_CHAVE_LOCAL_BASE64` | Fallback local para ambientes sem KMS |
| `CRIPTOGRAFIA_HASH_SEGREDO` | Segredo do HMAC deterministico |
| `S3_USE_KMS` | Liga `SSE-KMS` no fluxo de upload |

## Boas praticas adotadas

- logs nao incluem payload sensivel em texto puro
- a chave de dados e gerada por registro
- o KMS usa encryption context por entidade e campo
- a API retorna dados descriptografados apenas no contexto autorizado
- o schema continua legivel, sem vazar segredos estruturais

## Rotacao de chaves

O desenho com envelope encryption reduz impacto de rotacao:

- a `CMK` do KMS pode ser rotacionada pela AWS
- os registros antigos continuam descriptografaveis porque a data key cifrada e mantida
- uma recriptografia futura pode ser feita de forma gradual, por lote

## Recomendacoes operacionais

- habilitar rotacao automatica da CMK no AWS KMS
- restringir IAM para `kms:GenerateDataKey` e `kms:Decrypt`
- restringir o bucket para aceitar somente uploads com a CMK esperada
- monitorar a tabela `intencoes_upload` e expurgar intencoes expiradas periodicamente
- auditar acessos com CloudTrail e logs de aplicacao

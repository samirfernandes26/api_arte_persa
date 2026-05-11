import { z } from 'zod';

const stringVaziaParaUndefined = (valor: unknown): unknown => {
  if (typeof valor !== 'string') {
    return valor;
  }

  return valor.trim() === '' ? undefined : valor;
};

const booleanoDoAmbiente = z.preprocess((valor) => {
  if (typeof valor === 'boolean') {
    return valor;
  }

  if (typeof valor === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(valor.toLowerCase());
  }

  return valor;
}, z.boolean());

const inteiroDoAmbiente = z.preprocess((valor) => {
  if (typeof valor === 'number') {
    return valor;
  }

  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number(valor);
  }

  return valor;
}, z.number().int().nonnegative());

const decimalPositivoDoAmbiente = z.preprocess((valor) => {
  if (typeof valor === 'number') {
    return valor;
  }

  if (typeof valor === 'string' && valor.trim() !== '') {
    return Number(valor);
  }

  return valor;
}, z.number().nonnegative());

export const esquemaAmbiente = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  NOME_APLICACAO: z.string().min(1),
  PORTA_APLICACAO: inteiroDoAmbiente.default(3000),
  HOST_APLICACAO: z.string().min(1).default('0.0.0.0'),
  PREFIXO_GLOBAL_API: z.string().min(1).default('api'),
  CORS_ORIGENS_PERMITIDAS: z.string().min(1).default('http://localhost:3000'),
  CORS_CREDENCIAIS: booleanoDoAmbiente.default(true),
  FUSO_HORARIO_PADRAO: z.string().min(1).default('America/Sao_Paulo'),
  NIVEL_LOG: z.string().min(1).default('log,debug,warn,error'),
  URL_BANCO_DADOS: z.string().min(1),
  URL_BANCO_DADOS_SOMBRA: z.preprocess(
    stringVaziaParaUndefined,
    z.string().min(1).optional(),
  ),
  MYSQL_SENHA_ROOT: z.string().min(1),
  MYSQL_BANCO: z.string().min(1),
  MYSQL_USUARIO: z.string().min(1),
  MYSQL_SENHA: z.string().min(1),
  MYSQL_PORTA_PUBLICA: inteiroDoAmbiente.default(3306),
  REDIS_HOST: z.string().min(1),
  REDIS_PORTA: inteiroDoAmbiente.default(6379),
  REDIS_PORTA_PUBLICA: inteiroDoAmbiente.default(6379),
  REDIS_SENHA: z.preprocess(
    stringVaziaParaUndefined,
    z.string().min(1).optional(),
  ),
  REDIS_BANCO: inteiroDoAmbiente.default(0),
  REDIS_TLS: booleanoDoAmbiente.default(false),
  JWT_SEGREDO_ACESSO: z.string().min(16),
  JWT_TEMPO_ACESSO: z.string().min(2).default('15m'),
  JWT_SEGREDO_REFRESH: z.string().min(16),
  JWT_TEMPO_REFRESH: z.string().min(2).default('30d'),
  JWT_EMISSOR: z.string().min(1),
  JWT_AUDIENCIA: z.string().min(1),
  RODADAS_HASH_SENHA: inteiroDoAmbiente.default(10),
  THROTTLER_TTL_SEGUNDOS: inteiroDoAmbiente.default(60),
  THROTTLER_LIMITE: inteiroDoAmbiente.default(60),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_SESSION_TOKEN: z.preprocess(
    stringVaziaParaUndefined,
    z.string().optional(),
  ),
  AWS_REGION: z.string().min(1),
  AWS_KMS_KEY_ID: z.preprocess(
    stringVaziaParaUndefined,
    z.string().min(10).optional(),
  ),
  AWS_ENDPOINT: z.preprocess(
    stringVaziaParaUndefined,
    z.string().url().optional(),
  ),
  AWS_FORCE_PATH_STYLE: booleanoDoAmbiente.default(false),
  AWS_MAX_ATTEMPTS: inteiroDoAmbiente.default(3),
  USE_KMS_ENCRYPTION: booleanoDoAmbiente.default(true),
  CRIPTOGRAFIA_CHAVE_LOCAL_BASE64: z.preprocess(
    stringVaziaParaUndefined,
    z.string().optional(),
  ),
  CRIPTOGRAFIA_HASH_SEGREDO: z.string().min(32),
  S3_BUCKET_NAME: z.string().min(3),
  S3_PUBLIC_BASE_URL: z.preprocess(
    stringVaziaParaUndefined,
    z.string().url().optional(),
  ),
  S3_USE_KMS: booleanoDoAmbiente.default(true),
  S3_UPLOAD_URL_EXPIRES_IN: inteiroDoAmbiente.default(900),
  S3_GET_URL_EXPIRES_IN: inteiroDoAmbiente.default(3600),
  BULLMQ_PREFIXO: z.string().min(1).default('ordens-servico'),
  BULLMQ_REMOVER_CONCLUIDOS_SEGUNDOS: inteiroDoAmbiente.default(86400),
  BULLMQ_REMOVER_FALHAS_SEGUNDOS: inteiroDoAmbiente.default(604800),
  CAMINHO_BULL_BOARD: z.string().min(1).default('/admin/filas'),
  PERFIS_BULL_BOARD: z.string().min(1).default('supervisor,master'),
  CONCORRENCIA_FILA_IMAGEM: inteiroDoAmbiente.default(2),
  CONCORRENCIA_FILA_PDF: inteiroDoAmbiente.default(2),
  CONCORRENCIA_FILA_NOTIFICACAO: inteiroDoAmbiente.default(4),
  LIMITE_MB_ARQUIVO_IMAGEM: inteiroDoAmbiente.default(15),
  TIPOS_MIME_PERMITIDOS_IMAGEM: z.string().min(1),
  DESCONTO_MAXIMO_FUNCIONARIO: decimalPositivoDoAmbiente.default(10),
  DESCONTO_MAXIMO_SUPERVISOR: decimalPositivoDoAmbiente.default(20),
  DESCONTO_MAXIMO_MASTER: decimalPositivoDoAmbiente.default(100),
  PHPMYADMIN_PORTA: inteiroDoAmbiente.default(8080),
}).superRefine((ambiente, contexto) => {
  if ((ambiente.USE_KMS_ENCRYPTION || ambiente.S3_USE_KMS) && !ambiente.AWS_KMS_KEY_ID) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'AWS_KMS_KEY_ID e obrigatorio quando USE_KMS_ENCRYPTION=true ou S3_USE_KMS=true.',
      path: ['AWS_KMS_KEY_ID'],
    });
  }

  if (!ambiente.USE_KMS_ENCRYPTION && !ambiente.CRIPTOGRAFIA_CHAVE_LOCAL_BASE64) {
    contexto.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'CRIPTOGRAFIA_CHAVE_LOCAL_BASE64 e obrigatoria quando USE_KMS_ENCRYPTION=false.',
      path: ['CRIPTOGRAFIA_CHAVE_LOCAL_BASE64'],
    });
  }
});

export type Ambiente = z.infer<typeof esquemaAmbiente>;

export const validarAmbiente = (configuracao: Record<string, unknown>): Ambiente =>
  esquemaAmbiente.parse(configuracao);

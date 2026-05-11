import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface EstadoInfraestruturaIntegracao {
  modo: 'testcontainers' | 'servicos_externos';
  mysql: {
    id: string;
    host: string;
    porta: number;
    usuario: string;
    senha: string;
    banco: string;
    senhaRoot: string;
  };
  redis: {
    id: string;
    host: string;
    porta: number;
  };
}

export const caminhoEstadoInfraestrutura = join(
  process.cwd(),
  'test',
  '.estado-integracao.json',
);

export const lerEstadoInfraestrutura = (): EstadoInfraestruturaIntegracao => {
  if (!existsSync(caminhoEstadoInfraestrutura)) {
    throw new Error(
      `Arquivo de estado da infraestrutura de teste nao encontrado em ${caminhoEstadoInfraestrutura}.`,
    );
  }

  return JSON.parse(
    readFileSync(caminhoEstadoInfraestrutura, 'utf-8'),
  ) as EstadoInfraestruturaIntegracao;
};

export const montarVariaveisAmbienteIntegracao = (
  estado: EstadoInfraestruturaIntegracao,
): Record<string, string> => {
  const urlBanco = `mysql://${estado.mysql.usuario}:${estado.mysql.senha}@${estado.mysql.host}:${estado.mysql.porta}/${estado.mysql.banco}`;

  return {
    NODE_ENV: 'test',
    NOME_APLICACAO: 'api-ordens-servico-teste',
    PORTA_APLICACAO: '3010',
    HOST_APLICACAO: '127.0.0.1',
    PREFIXO_GLOBAL_API: 'api',
    CORS_ORIGENS_PERMITIDAS: 'http://localhost:3000,http://localhost:5173',
    CORS_CREDENCIAIS: 'true',
    FUSO_HORARIO_PADRAO: 'America/Sao_Paulo',
    NIVEL_LOG: 'error,warn,log',
    URL_BANCO_DADOS: urlBanco,
    MYSQL_SENHA_ROOT: estado.mysql.senhaRoot,
    MYSQL_BANCO: estado.mysql.banco,
    MYSQL_USUARIO: estado.mysql.usuario,
    MYSQL_SENHA: estado.mysql.senha,
    MYSQL_PORTA_PUBLICA: String(estado.mysql.porta),
    REDIS_HOST: estado.redis.host,
    REDIS_PORTA: String(estado.redis.porta),
    REDIS_PORTA_PUBLICA: String(estado.redis.porta),
    REDIS_BANCO: '0',
    REDIS_TLS: 'false',
    JWT_SEGREDO_ACESSO: 'segredo-acesso-integracao-super-seguro-123',
    JWT_TEMPO_ACESSO: '30m',
    JWT_SEGREDO_REFRESH: 'segredo-refresh-integracao-super-seguro-456',
    JWT_TEMPO_REFRESH: '30d',
    JWT_EMISSOR: 'testes-integracao',
    JWT_AUDIENCIA: 'api-ordens-servico-teste',
    RODADAS_HASH_SENHA: '4',
    THROTTLER_TTL_SEGUNDOS: '60',
    THROTTLER_LIMITE: '200',
    AWS_ACCESS_KEY_ID: 'teste',
    AWS_SECRET_ACCESS_KEY: 'teste',
    AWS_REGION: 'us-east-1',
    AWS_KMS_KEY_ID: 'arn:aws:kms:us-east-1:123456789012:key/teste-integracao',
    AWS_FORCE_PATH_STYLE: 'true',
    AWS_MAX_ATTEMPTS: '2',
    USE_KMS_ENCRYPTION: 'false',
    CRIPTOGRAFIA_CHAVE_LOCAL_BASE64:
      'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    CRIPTOGRAFIA_HASH_SEGREDO:
      'segredo-hmac-integracao-super-seguro-para-campos-sensiveis-123456',
    S3_BUCKET_NAME: 'bucket-teste-integracao',
    S3_USE_KMS: 'true',
    S3_UPLOAD_URL_EXPIRES_IN: '900',
    S3_GET_URL_EXPIRES_IN: '900',
    BULLMQ_PREFIXO: 'ordens-servico-teste',
    BULLMQ_REMOVER_CONCLUIDOS_SEGUNDOS: '86400',
    BULLMQ_REMOVER_FALHAS_SEGUNDOS: '86400',
    CAMINHO_BULL_BOARD: '/admin/filas',
    PERFIS_BULL_BOARD: 'supervisor,master',
    CONCORRENCIA_FILA_IMAGEM: '1',
    CONCORRENCIA_FILA_PDF: '1',
    CONCORRENCIA_FILA_NOTIFICACAO: '1',
    LIMITE_MB_ARQUIVO_IMAGEM: '15',
    TIPOS_MIME_PERMITIDOS_IMAGEM: 'image/jpeg,image/png,image/webp',
    DESCONTO_MAXIMO_FUNCIONARIO: '10',
    DESCONTO_MAXIMO_SUPERVISOR: '20',
    DESCONTO_MAXIMO_MASTER: '100',
    PHPMYADMIN_PORTA: '8088',
  };
};

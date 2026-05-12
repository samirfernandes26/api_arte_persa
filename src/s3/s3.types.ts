export type TipoCriptografiaServidorS3 = 'aws:kms' | 'AES256';

export interface EntradaEnvioArquivoS3 {
  chave: string;
  corpo: Buffer | Uint8Array | string;
  tipo_conteudo: string;
  bucket?: string;
  disposicao_conteudo?: string;
  cache_control?: string;
  metadados?: Record<string, string>;
}

export interface ResultadoEnvioArquivoS3 {
  bucket: string;
  chave: string;
  url: string;
  etag?: string;
  criptografia_servidor?: TipoCriptografiaServidorS3;
  kms_key_id?: string;
}

export interface EntradaUrlPreAssinadaS3 {
  chave: string;
  operacao?: 'putObject' | 'getObject';
  expira_em?: number;
  bucket?: string;
  tipo_conteudo?: string;
  disposicao_conteudo?: string;
  cache_control?: string;
  metadados?: Record<string, string>;
}

export interface ResultadoUrlPreAssinadaS3 {
  chave: string;
  url: string;
  metodo: 'PUT' | 'GET';
  expira_em: number;
  cabecalhos: Record<string, string>;
  criptografia_servidor?: TipoCriptografiaServidorS3;
  kms_key_id?: string;
}

export interface MetadadosObjetoS3 {
  bucket: string;
  chave: string;
  tipo_conteudo?: string;
  tamanho_bytes?: number;
  etag?: string;
  metadados: Record<string, string>;
}

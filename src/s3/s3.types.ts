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
}

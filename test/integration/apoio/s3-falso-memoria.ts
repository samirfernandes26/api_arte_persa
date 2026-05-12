import {
  EntradaEnvioArquivoS3,
  EntradaUrlPreAssinadaS3,
  MetadadosObjetoS3,
  ResultadoEnvioArquivoS3,
  ResultadoUrlPreAssinadaS3,
} from '../../../src/s3/s3.types';

export class S3FalsoMemoria {
  private readonly bucketPadrao = 'bucket-teste-integracao';
  private readonly objetos = new Map<
    string,
    {
      corpo: Buffer;
      tipoConteudo?: string;
      url: string;
      metadados: Record<string, string>;
    }
  >();

  async enviarArquivo(
    entrada: EntradaEnvioArquivoS3,
  ): Promise<ResultadoEnvioArquivoS3> {
    const chave = entrada.chave.replace(/^\/+/, '');
    const corpo = Buffer.isBuffer(entrada.corpo)
      ? entrada.corpo
      : Buffer.from(String(entrada.corpo));
    const url = this.obterUrlObjeto(chave);

    this.objetos.set(chave, {
        corpo,
        tipoConteudo: entrada.tipo_conteudo,
        url,
        metadados: entrada.metadados ?? {},
      });

    const usarKms = process.env.S3_USE_KMS === 'true';
    const chaveKmsId = process.env.AWS_KMS_KEY_ID || undefined;

    return {
      bucket: this.bucketPadrao,
      chave,
      url,
      etag: `etag-${chave}`,
      criptografia_servidor: usarKms ? 'aws:kms' : 'AES256',
      kms_key_id: usarKms ? chaveKmsId : undefined,
    };
  }

  async uploadFile(
    entrada: EntradaEnvioArquivoS3,
  ): Promise<ResultadoEnvioArquivoS3> {
    return this.enviarArquivo(entrada);
  }

  async obterUrlPreAssinada(
    entrada: EntradaUrlPreAssinadaS3,
  ): Promise<ResultadoUrlPreAssinadaS3> {
    const chave = entrada.chave.replace(/^\/+/, '');
    const usarKms = process.env.S3_USE_KMS === 'true';
    const chaveKmsId = process.env.AWS_KMS_KEY_ID || undefined;
    const cabecalhos: Record<string, string> = {};

    if (entrada.tipo_conteudo) {
      cabecalhos['Content-Type'] = entrada.tipo_conteudo;
    }

    cabecalhos['x-amz-server-side-encryption'] = usarKms ? 'aws:kms' : 'AES256';
    if (usarKms && chaveKmsId) {
      cabecalhos['x-amz-server-side-encryption-aws-kms-key-id'] = chaveKmsId;
    }

    return {
      chave,
      url: `https://s3-falso.local/${chave}`,
      metodo: entrada.operacao === 'getObject' ? 'GET' : 'PUT',
      expira_em: entrada.expira_em ?? 900,
      cabecalhos,
      criptografia_servidor: usarKms ? 'aws:kms' : 'AES256',
      kms_key_id: usarKms ? chaveKmsId : undefined,
    };
  }

  async getPresignedUrl(
    entrada: EntradaUrlPreAssinadaS3,
  ): Promise<ResultadoUrlPreAssinadaS3> {
    return this.obterUrlPreAssinada(entrada);
  }

  async removerArquivo(chave: string): Promise<void> {
    this.objetos.delete(chave.replace(/^\/+/, ''));
  }

  async deleteFile(chave: string): Promise<void> {
    await this.removerArquivo(chave);
  }

  obterUrlObjeto(chave: string): string {
    return `https://s3-falso.local/${chave.replace(/^\/+/, '')}`;
  }

  getObjectUrl(chave: string): string {
    return this.obterUrlObjeto(chave);
  }

  obterBucketPadrao(): string {
    return this.bucketPadrao;
  }

  async obterBufferObjeto(chave: string): Promise<Buffer> {
    const objeto = this.objetos.get(chave.replace(/^\/+/, ''));
    return objeto?.corpo ?? Buffer.from('conteudo-falso');
  }

  async getObjectBuffer(chave: string): Promise<Buffer> {
    return this.obterBufferObjeto(chave);
  }

  async obterMetadadosObjeto(chave: string): Promise<MetadadosObjetoS3 | null> {
    const chaveNormalizada = chave.replace(/^\/+/, '');
    const objeto = this.objetos.get(chaveNormalizada);
    if (!objeto) {
      return null;
    }

    return {
      bucket: this.bucketPadrao,
      chave: chaveNormalizada,
      tipo_conteudo: objeto.tipoConteudo,
      tamanho_bytes: objeto.corpo.byteLength,
      etag: `etag-${chaveNormalizada}`,
      metadados: objeto.metadados,
    };
  }

  async getObjectMetadata(chave: string): Promise<MetadadosObjetoS3 | null> {
    return this.obterMetadadosObjeto(chave);
  }

  registrarUploadSimulado(
    chave: string,
    conteudo: Buffer | string,
    tipoConteudo?: string,
  ) {
    const buffer = Buffer.isBuffer(conteudo)
      ? conteudo
      : Buffer.from(conteudo);
    this.objetos.set(chave, {
      corpo: buffer,
      tipoConteudo,
      url: this.obterUrlObjeto(chave),
      metadados: {},
    });
  }

  listarChaves() {
    return [...this.objetos.keys()];
  }

  limpar() {
    this.objetos.clear();
  }
}

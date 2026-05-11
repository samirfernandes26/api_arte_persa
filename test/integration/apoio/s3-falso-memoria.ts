import {
  EntradaEnvioArquivoS3,
  EntradaUrlPreAssinadaS3,
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
    });

    return {
      bucket: this.bucketPadrao,
      chave,
      url,
      etag: `etag-${chave}`,
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
    return {
      chave,
      url: `https://s3-falso.local/${chave}`,
      metodo: entrada.operacao === 'getObject' ? 'GET' : 'PUT',
      expira_em: entrada.expira_em ?? 900,
      cabecalhos: entrada.tipo_conteudo
        ? { 'Content-Type': entrada.tipo_conteudo }
        : {},
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
    });
  }

  listarChaves() {
    return [...this.objetos.keys()];
  }

  limpar() {
    this.objetos.clear();
  }
}

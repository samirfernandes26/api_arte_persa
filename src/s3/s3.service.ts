import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EntradaEnvioArquivoS3,
  EntradaUrlPreAssinadaS3,
  ResultadoEnvioArquivoS3,
  ResultadoUrlPreAssinadaS3,
  MetadadosObjetoS3,
  TipoCriptografiaServidorS3,
} from './s3.types';

@Injectable()
export class ServicoS3 {
  private readonly logger = new Logger(ServicoS3.name);
  private readonly bucketPadrao: string;
  private readonly urlBasePublica?: string;
  private readonly expiracaoUpload: number;
  private readonly expiracaoDownload: number;
  private readonly endpoint?: string;
  private readonly regiao: string;
  private readonly forcePathStyle: boolean;
  private readonly usarKmsNoS3: boolean;
  private readonly chaveKmsId?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly s3Client: S3Client,
  ) {
    this.bucketPadrao = this.configService.getOrThrow<string>('S3_BUCKET_NAME');
    this.urlBasePublica =
      this.configService.get<string>('S3_PUBLIC_BASE_URL') || undefined;
    this.expiracaoUpload = this.configService.get<number>(
      'S3_UPLOAD_URL_EXPIRES_IN',
      900,
    );
    this.expiracaoDownload = this.configService.get<number>(
      'S3_GET_URL_EXPIRES_IN',
      3600,
    );
    this.endpoint = this.configService.get<string>('AWS_ENDPOINT') || undefined;
    this.regiao = this.configService.getOrThrow<string>('AWS_REGION');
    this.forcePathStyle = this.configService.get<boolean>(
      'AWS_FORCE_PATH_STYLE',
      false,
    );
    this.usarKmsNoS3 = this.configService.get<boolean>('S3_USE_KMS', true);
    this.chaveKmsId = this.configService.get<string>('AWS_KMS_KEY_ID') || undefined;

    if (this.usarKmsNoS3 && !this.chaveKmsId) {
      throw new Error(
        'AWS_KMS_KEY_ID precisa ser informado quando S3_USE_KMS=true.',
      );
    }
  }

  async enviarArquivo(
    entrada: EntradaEnvioArquivoS3,
  ): Promise<ResultadoEnvioArquivoS3> {
    const bucket = entrada.bucket ?? this.bucketPadrao;
    const chaveNormalizada = this.normalizarChave(entrada.chave);

    try {
      const configuracaoCriptografia = this.resolverCriptografiaServidor();
      const resposta = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: chaveNormalizada,
          Body: entrada.corpo,
          ContentType: entrada.tipo_conteudo,
          ContentDisposition: entrada.disposicao_conteudo,
          CacheControl: entrada.cache_control,
          Metadata: entrada.metadados,
          ServerSideEncryption: configuracaoCriptografia.tipo,
          SSEKMSKeyId: configuracaoCriptografia.kmsKeyId,
        }),
      );

      const url = this.obterUrlObjeto(chaveNormalizada, bucket);
      this.logger.log(`Upload concluido para s3://${bucket}/${chaveNormalizada}`);

      return {
        bucket,
        chave: chaveNormalizada,
        url,
        etag: resposta.ETag,
        criptografia_servidor: configuracaoCriptografia.tipo,
        kms_key_id: configuracaoCriptografia.kmsKeyId,
      };
    } catch (erro) {
      this.logger.error(
        `Falha ao enviar arquivo para s3://${bucket}/${chaveNormalizada}`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel enviar o arquivo para o S3.',
      );
    }
  }

  async uploadFile(
    entrada: EntradaEnvioArquivoS3,
  ): Promise<ResultadoEnvioArquivoS3> {
    return this.enviarArquivo(entrada);
  }

  async obterUrlPreAssinada(
    entrada: EntradaUrlPreAssinadaS3,
  ): Promise<ResultadoUrlPreAssinadaS3> {
    const bucket = entrada.bucket ?? this.bucketPadrao;
    const chaveNormalizada = this.normalizarChave(entrada.chave);
    const operacao = entrada.operacao ?? 'putObject';
    const expiraEm =
      entrada.expira_em ??
      (operacao === 'putObject' ? this.expiracaoUpload : this.expiracaoDownload);

    if (expiraEm <= 0) {
      throw new BadRequestException(
        'A expiracao da URL pre-assinada precisa ser positiva.',
      );
    }

    try {
      const configuracaoCriptografia = this.resolverCriptografiaServidor();
      const comando =
        operacao === 'putObject'
          ? new PutObjectCommand({
              Bucket: bucket,
              Key: chaveNormalizada,
              ContentType: entrada.tipo_conteudo,
              ContentDisposition: entrada.disposicao_conteudo,
              CacheControl: entrada.cache_control,
              Metadata: entrada.metadados,
              ServerSideEncryption: configuracaoCriptografia.tipo,
              SSEKMSKeyId: configuracaoCriptografia.kmsKeyId,
            })
          : new GetObjectCommand({
              Bucket: bucket,
              Key: chaveNormalizada,
              ResponseContentType: entrada.tipo_conteudo,
              ResponseContentDisposition: entrada.disposicao_conteudo,
              ResponseCacheControl: entrada.cache_control,
            });

      const url = await getSignedUrl(this.s3Client, comando, {
        expiresIn: expiraEm,
      });

      const cabecalhos: Record<string, string> = {};
      if (operacao === 'putObject' && entrada.tipo_conteudo) {
        cabecalhos['Content-Type'] = entrada.tipo_conteudo;
      }
      if (operacao === 'putObject') {
        cabecalhos['x-amz-server-side-encryption'] = configuracaoCriptografia.tipo;
        if (configuracaoCriptografia.kmsKeyId) {
          cabecalhos['x-amz-server-side-encryption-aws-kms-key-id'] =
            configuracaoCriptografia.kmsKeyId;
        }
      }

      this.logger.log(
        `URL pre-assinada gerada para s3://${bucket}/${chaveNormalizada}`,
      );

      return {
        chave: chaveNormalizada,
        url,
        metodo: operacao === 'putObject' ? 'PUT' : 'GET',
        expira_em: expiraEm,
        cabecalhos,
        criptografia_servidor:
          operacao === 'putObject' ? configuracaoCriptografia.tipo : undefined,
        kms_key_id:
          operacao === 'putObject' ? configuracaoCriptografia.kmsKeyId : undefined,
      };
    } catch (erro) {
      this.logger.error(
        `Falha ao gerar URL pre-assinada para s3://${bucket}/${chaveNormalizada}`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel gerar a URL pre-assinada.',
      );
    }
  }

  async getPresignedUrl(
    entrada: EntradaUrlPreAssinadaS3,
  ): Promise<ResultadoUrlPreAssinadaS3> {
    return this.obterUrlPreAssinada(entrada);
  }

  async removerArquivo(chave: string, bucket = this.bucketPadrao): Promise<void> {
    const chaveNormalizada = this.normalizarChave(chave);

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: chaveNormalizada,
        }),
      );

      this.logger.log(`Arquivo removido de s3://${bucket}/${chaveNormalizada}`);
    } catch (erro) {
      this.logger.error(
        `Falha ao remover arquivo de s3://${bucket}/${chaveNormalizada}`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel remover o arquivo do S3.',
      );
    }
  }

  async deleteFile(chave: string, bucket = this.bucketPadrao): Promise<void> {
    await this.removerArquivo(chave, bucket);
  }

  obterUrlObjeto(chave: string, bucket = this.bucketPadrao): string {
    const chaveNormalizada = this.normalizarChave(chave);

    if (this.urlBasePublica) {
      return `${this.urlBasePublica.replace(/\/$/, '')}/${chaveNormalizada}`;
    }

    if (this.endpoint) {
      const endpointNormalizado = this.endpoint.replace(/\/$/, '');
      if (this.forcePathStyle) {
        return `${endpointNormalizado}/${bucket}/${chaveNormalizada}`;
      }

      return `${endpointNormalizado}/${chaveNormalizada}`;
    }

    return `https://${bucket}.s3.${this.regiao}.amazonaws.com/${chaveNormalizada}`;
  }

  getObjectUrl(chave: string, bucket = this.bucketPadrao): string {
    return this.obterUrlObjeto(chave, bucket);
  }

  obterBucketPadrao(): string {
    return this.bucketPadrao;
  }

  async obterBufferObjeto(
    chave: string,
    bucket = this.bucketPadrao,
  ): Promise<Buffer> {
    const chaveNormalizada = this.normalizarChave(chave);

    try {
      const resposta = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: chaveNormalizada,
        }),
      );

      if (!resposta.Body) {
        throw new InternalServerErrorException('Objeto S3 retornado sem corpo.');
      }

      const bytes = await resposta.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (erro) {
      this.logger.error(
        `Falha ao obter buffer de s3://${bucket}/${chaveNormalizada}`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel ler o objeto armazenado no S3.',
      );
    }
  }

  async getObjectBuffer(chave: string, bucket = this.bucketPadrao): Promise<Buffer> {
    return this.obterBufferObjeto(chave, bucket);
  }

  async obterMetadadosObjeto(
    chave: string,
    bucket = this.bucketPadrao,
  ): Promise<MetadadosObjetoS3 | null> {
    const chaveNormalizada = this.normalizarChave(chave);

    try {
      const resposta = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: bucket,
          Key: chaveNormalizada,
        }),
      );

      return {
        bucket,
        chave: chaveNormalizada,
        tipo_conteudo: resposta.ContentType ?? undefined,
        tamanho_bytes: resposta.ContentLength ?? undefined,
        etag: resposta.ETag ?? undefined,
        metadados: resposta.Metadata ?? {},
      };
    } catch (erro) {
      if (this.ehObjetoNaoEncontrado(erro)) {
        this.logger.warn(`Objeto S3 nao encontrado em s3://${bucket}/${chaveNormalizada}`);
        return null;
      }

      this.logger.error(
        `Falha ao obter metadados de s3://${bucket}/${chaveNormalizada}`,
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel obter os metadados do objeto no S3.',
      );
    }
  }

  async getObjectMetadata(
    chave: string,
    bucket = this.bucketPadrao,
  ): Promise<MetadadosObjetoS3 | null> {
    return this.obterMetadadosObjeto(chave, bucket);
  }

  private normalizarChave(chave: string): string {
    const chaveNormalizada = chave.trim().replace(/^\/+/, '');

    if (!chaveNormalizada) {
      throw new BadRequestException('A chave do objeto S3 nao pode ser vazia.');
    }

    return chaveNormalizada;
  }

  private resolverCriptografiaServidor(): {
    tipo: TipoCriptografiaServidorS3;
    kmsKeyId?: string;
  } {
    if (this.usarKmsNoS3) {
      return {
        tipo: 'aws:kms',
        kmsKeyId: this.chaveKmsId,
      };
    }

    return {
      tipo: 'AES256',
    };
  }

  private ehObjetoNaoEncontrado(erro: unknown): boolean {
    if (!(erro instanceof Error)) {
      return false;
    }

    const erroComCodigo = erro as Error & {
      $metadata?: { httpStatusCode?: number };
      name?: string;
    };

    return (
      erroComCodigo.$metadata?.httpStatusCode === 404 ||
      erroComCodigo.name === 'NotFound' ||
      erroComCodigo.name === 'NoSuchKey'
    );
  }
}

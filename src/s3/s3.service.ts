import {
  DeleteObjectCommand,
  GetObjectCommand,
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
  }

  async enviarArquivo(
    entrada: EntradaEnvioArquivoS3,
  ): Promise<ResultadoEnvioArquivoS3> {
    const bucket = entrada.bucket ?? this.bucketPadrao;
    const chaveNormalizada = this.normalizarChave(entrada.chave);

    try {
      const resposta = await this.s3Client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: chaveNormalizada,
          Body: entrada.corpo,
          ContentType: entrada.tipo_conteudo,
          ContentDisposition: entrada.disposicao_conteudo,
          CacheControl: entrada.cache_control,
          Metadata: entrada.metadados,
        }),
      );

      const url = this.obterUrlObjeto(chaveNormalizada, bucket);
      this.logger.log(`Upload concluido para s3://${bucket}/${chaveNormalizada}`);

      return {
        bucket,
        chave: chaveNormalizada,
        url,
        etag: resposta.ETag,
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
      const comando =
        operacao === 'putObject'
          ? new PutObjectCommand({
              Bucket: bucket,
              Key: chaveNormalizada,
              ContentType: entrada.tipo_conteudo,
              ContentDisposition: entrada.disposicao_conteudo,
              CacheControl: entrada.cache_control,
              Metadata: entrada.metadados,
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

      this.logger.log(
        `URL pre-assinada gerada para s3://${bucket}/${chaveNormalizada}`,
      );

      return {
        chave: chaveNormalizada,
        url,
        metodo: operacao === 'putObject' ? 'PUT' : 'GET',
        expira_em: expiraEm,
        cabecalhos,
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

  private normalizarChave(chave: string): string {
    const chaveNormalizada = chave.trim().replace(/^\/+/, '');

    if (!chaveNormalizada) {
      throw new BadRequestException('A chave do objeto S3 nao pode ser vazia.');
    }

    return chaveNormalizada;
  }
}

export { ServicoS3 as S3Service };

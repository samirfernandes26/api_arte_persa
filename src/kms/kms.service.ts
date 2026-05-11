import {
  DecryptCommand,
  GenerateDataKeyCommand,
  KMSClient,
} from '@aws-sdk/client-kms';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

interface ContextoCriptografia {
  campo?: string;
  entidade?: string;
  identificador?: string;
}

interface PacoteDadosCriptografados {
  versao: 'kms-envelope-v1';
  algoritmo: 'aes-256-gcm';
  provedor_chave: 'aws-kms' | 'local';
  chave_dados_criptografada: string;
  iv: string;
  auth_tag: string;
  dados_criptografados: string;
  contexto: Record<string, string>;
}

interface PacoteJsonCriptografado {
  __kms_envelope_v1: string;
}

const PREFIXO_DADOS_CRIPTOGRAFADOS = 'kms-envelope-v1:';

@Injectable()
export class ServicoKms {
  private readonly logger = new Logger(ServicoKms.name);
  private readonly usarKms: boolean;
  private readonly chaveKmsId?: string;
  private readonly chaveLocal?: Buffer;
  private readonly segredoHash: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly kmsClient: KMSClient,
  ) {
    this.usarKms = this.configService.get<boolean>('USE_KMS_ENCRYPTION', true);
    this.chaveKmsId = this.configService.get<string>('AWS_KMS_KEY_ID') || undefined;
    this.segredoHash = this.configService.getOrThrow<string>('CRIPTOGRAFIA_HASH_SEGREDO');

    const chaveLocalBase64 =
      this.configService.get<string>('CRIPTOGRAFIA_CHAVE_LOCAL_BASE64') || undefined;
    this.chaveLocal = chaveLocalBase64
      ? Buffer.from(chaveLocalBase64, 'base64')
      : undefined;

    if (this.usarKms && !this.chaveKmsId) {
      throw new Error(
        'AWS_KMS_KEY_ID precisa ser informado quando USE_KMS_ENCRYPTION=true.',
      );
    }

    if (!this.usarKms && (!this.chaveLocal || this.chaveLocal.length !== 32)) {
      throw new Error(
        'CRIPTOGRAFIA_CHAVE_LOCAL_BASE64 precisa conter 32 bytes em base64 quando USE_KMS_ENCRYPTION=false.',
      );
    }
  }

  async encryptData(
    dado: string | null | undefined,
    contexto?: ContextoCriptografia,
  ): Promise<string | null | undefined> {
    if (dado === undefined) {
      return undefined;
    }

    if (dado === null || dado === '') {
      return dado;
    }

    if (this.ehDadoCriptografado(dado)) {
      return dado;
    }

    return this.encryptWithDataKey(dado, contexto);
  }

  async decryptData(
    dadoCriptografado: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (dadoCriptografado === undefined) {
      return undefined;
    }

    if (dadoCriptografado === null || dadoCriptografado === '') {
      return dadoCriptografado;
    }

    if (!this.ehDadoCriptografado(dadoCriptografado)) {
      return dadoCriptografado;
    }

    const pacote = this.desempacotar(dadoCriptografado);
    const chaveDados = await this.descriptografarChaveDados(pacote);

    try {
      const aad = Buffer.from(JSON.stringify(pacote.contexto), 'utf-8');
      return this.descriptografarConteudo(
        Buffer.from(pacote.dados_criptografados, 'base64'),
        chaveDados,
        Buffer.from(pacote.iv, 'base64'),
        Buffer.from(pacote.auth_tag, 'base64'),
        aad,
      ).toString('utf-8');
    } catch (erro) {
      this.logger.error(
        'Falha ao descriptografar conteudo protegido por envelope encryption.',
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel descriptografar um dado sensivel.',
      );
    }
  }

  async encryptWithDataKey(
    dado: string,
    contexto?: ContextoCriptografia,
  ): Promise<string> {
    const contextoNormalizado = this.montarContexto(contexto);
    const chaveDados = this.usarKms
      ? await this.gerarChaveDadosComKms(contextoNormalizado)
      : this.gerarChaveDadosLocal(contextoNormalizado);

    const iv = randomBytes(12);
    const aad = Buffer.from(JSON.stringify(contextoNormalizado), 'utf-8');
    const { conteudoCriptografado, authTag } = this.criptografarConteudo(
      Buffer.from(dado, 'utf-8'),
      chaveDados.chaveDadosPlana,
      iv,
      aad,
    );

    const pacote: PacoteDadosCriptografados = {
      versao: 'kms-envelope-v1',
      algoritmo: 'aes-256-gcm',
      provedor_chave: chaveDados.provedorChave,
      chave_dados_criptografada: chaveDados.chaveDadosCriptografada.toString('base64'),
      iv: iv.toString('base64'),
      auth_tag: authTag.toString('base64'),
      dados_criptografados: conteudoCriptografado.toString('base64'),
      contexto: contextoNormalizado,
    };

    return this.empacotar(pacote);
  }

  async criptografarJson<T>(
    valor: T | null | undefined,
    contexto?: ContextoCriptografia,
  ): Promise<PacoteJsonCriptografado | null | undefined> {
    if (valor === undefined) {
      return undefined;
    }

    if (valor === null) {
      return null;
    }

    return {
      __kms_envelope_v1: await this.encryptWithDataKey(
        JSON.stringify(valor),
        contexto,
      ),
    };
  }

  async descriptografarJson<T>(valor: unknown): Promise<T | null> {
    if (valor === null || valor === undefined) {
      return null;
    }

    if (
      typeof valor === 'object' &&
      valor &&
      '__kms_envelope_v1' in valor &&
      typeof (valor as PacoteJsonCriptografado).__kms_envelope_v1 === 'string'
    ) {
      const conteudo = await this.decryptData(
        (valor as PacoteJsonCriptografado).__kms_envelope_v1,
      );
      return conteudo ? (JSON.parse(conteudo) as T) : null;
    }

    return valor as T;
  }

  gerarHashDeterministico(
    valor: string | null | undefined,
  ): string | null | undefined {
    if (valor === undefined) {
      return undefined;
    }

    if (valor === null || valor === '') {
      return valor;
    }

    return createHmac('sha256', this.segredoHash)
      .update(valor, 'utf-8')
      .digest('hex');
  }

  private montarContexto(
    contexto?: ContextoCriptografia,
  ): Record<string, string> {
    return {
      aplicacao: this.configService.get<string>(
        'NOME_APLICACAO',
        'api-ordens-servico',
      ),
      campo: contexto?.campo ?? 'desconhecido',
      entidade: contexto?.entidade ?? 'desconhecida',
      identificador: contexto?.identificador ?? 'nao-informado',
    };
  }

  private async gerarChaveDadosComKms(contexto: Record<string, string>) {
    try {
      const resposta = await this.kmsClient.send(
        new GenerateDataKeyCommand({
          KeyId: this.chaveKmsId,
          KeySpec: 'AES_256',
          EncryptionContext: contexto,
        }),
      );

      if (!resposta.Plaintext || !resposta.CiphertextBlob) {
        throw new InternalServerErrorException(
          'AWS KMS nao retornou uma data key valida.',
        );
      }

      return {
        provedorChave: 'aws-kms' as const,
        chaveDadosPlana: Buffer.from(resposta.Plaintext),
        chaveDadosCriptografada: Buffer.from(resposta.CiphertextBlob),
      };
    } catch (erro) {
      this.logger.error(
        'Falha ao solicitar data key ao AWS KMS.',
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel gerar a data key para criptografia.',
      );
    }
  }

  private gerarChaveDadosLocal(contexto: Record<string, string>) {
    const chaveDadosPlana = randomBytes(32);
    const iv = randomBytes(12);
    const { conteudoCriptografado, authTag } = this.criptografarConteudo(
      chaveDadosPlana,
      this.chaveLocal!,
      iv,
      Buffer.from(JSON.stringify(contexto), 'utf-8'),
    );

    const pacote = JSON.stringify({
      versao: 'local-envelope-v1',
      algoritmo: 'aes-256-gcm',
      iv: iv.toString('base64'),
      auth_tag: authTag.toString('base64'),
      dados: conteudoCriptografado.toString('base64'),
    });

    return {
      provedorChave: 'local' as const,
      chaveDadosPlana,
      chaveDadosCriptografada: Buffer.from(pacote, 'utf-8'),
    };
  }

  private async descriptografarChaveDados(
    pacote: PacoteDadosCriptografados,
  ): Promise<Buffer> {
    if (pacote.provedor_chave === 'aws-kms') {
      try {
        const resposta = await this.kmsClient.send(
          new DecryptCommand({
            CiphertextBlob: Buffer.from(pacote.chave_dados_criptografada, 'base64'),
            EncryptionContext: pacote.contexto,
          }),
        );

        if (!resposta.Plaintext) {
          throw new InternalServerErrorException(
            'AWS KMS nao retornou a data key descriptografada.',
          );
        }

        return Buffer.from(resposta.Plaintext);
      } catch (erro) {
        this.logger.error(
          'Falha ao descriptografar data key com AWS KMS.',
          erro instanceof Error ? erro.stack : undefined,
        );
        throw new InternalServerErrorException(
          'Nao foi possivel descriptografar a data key protegida pelo KMS.',
        );
      }
    }

    try {
      const pacoteLocal = JSON.parse(
        Buffer.from(pacote.chave_dados_criptografada, 'base64').toString('utf-8'),
      ) as {
        iv: string;
        auth_tag: string;
        dados: string;
      };

      const contextoAad = Buffer.from(JSON.stringify(pacote.contexto), 'utf-8');

      return this.descriptografarConteudo(
        Buffer.from(pacoteLocal.dados, 'base64'),
        this.chaveLocal!,
        Buffer.from(pacoteLocal.iv, 'base64'),
        Buffer.from(pacoteLocal.auth_tag, 'base64'),
        contextoAad,
      );
    } catch (erro) {
      this.logger.error(
        'Falha ao descriptografar data key local.',
        erro instanceof Error ? erro.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Nao foi possivel descriptografar a data key local.',
      );
    }
  }

  private criptografarConteudo(
    conteudo: Buffer,
    chave: Buffer,
    iv: Buffer,
    aad?: Buffer,
  ) {
    const cipher = createCipheriv('aes-256-gcm', chave, iv);
    if (aad) {
      cipher.setAAD(aad);
    }

    const conteudoCriptografado = Buffer.concat([
      cipher.update(conteudo),
      cipher.final(),
    ]);

    return {
      conteudoCriptografado,
      authTag: cipher.getAuthTag(),
    };
  }

  private descriptografarConteudo(
    conteudoCriptografado: Buffer,
    chave: Buffer,
    iv: Buffer,
    authTag: Buffer,
    aad?: Buffer,
  ): Buffer {
    const decipher = createDecipheriv('aes-256-gcm', chave, iv);
    if (aad) {
      decipher.setAAD(aad);
    }
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(conteudoCriptografado),
      decipher.final(),
    ]);
  }

  private empacotar(pacote: PacoteDadosCriptografados): string {
    return `${PREFIXO_DADOS_CRIPTOGRAFADOS}${Buffer.from(
      JSON.stringify(pacote),
      'utf-8',
    ).toString('base64')}`;
  }

  private desempacotar(valor: string): PacoteDadosCriptografados {
    return JSON.parse(
      Buffer.from(valor.replace(PREFIXO_DADOS_CRIPTOGRAFADOS, ''), 'base64').toString(
        'utf-8',
      ),
    ) as PacoteDadosCriptografados;
  }

  private ehDadoCriptografado(valor: string): boolean {
    return valor.startsWith(PREFIXO_DADOS_CRIPTOGRAFADOS);
  }
}

export { ServicoKms as KmsService };

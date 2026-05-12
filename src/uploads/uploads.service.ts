import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { TipoDestinoUpload } from '../comum/enums/tipo-destino-upload.enum';
import { ServicoPrisma } from '../prisma/prisma.service';
import { ServicoS3 } from '../s3/s3.service';
import {
  ConfirmarArquivoClienteDto,
  ConfirmarAssinaturaOrdemServicoDto,
  ConfirmarImagemOrdemServicoDto,
} from './dto/confirmar-upload.dto';
import { GerarUrlPreAssinadaDto } from './dto/gerar-url-pre-assinada.dto';

interface ContextoUpload {
  tipo_destino: TipoDestinoUpload;
  ordem_servico_id?: number;
  item_ordem_servico_id?: number;
  cliente_id?: number;
  fatura_id?: number;
}

interface ConfirmacaoUploadInterna extends ContextoUpload {
  chave_s3: string;
  nome_arquivo?: string;
  tipo_mime?: string;
  tamanho_bytes?: number;
}

interface UploadConfirmado {
  bucket: string;
  chave_s3: string;
  nome_arquivo: string;
  tipo_mime: string;
  tamanho_bytes?: number;
  url_arquivo: string;
}

@Injectable()
export class ServicoUploads {
  private readonly logger = new Logger(ServicoUploads.name);
  private readonly limiteArquivoBytes: number;
  private readonly tiposMimeImagemPermitidos: Set<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: ServicoPrisma,
    private readonly s3Service: ServicoS3,
  ) {
    this.limiteArquivoBytes =
      this.configService.get<number>('LIMITE_MB_ARQUIVO_IMAGEM', 15) * 1024 * 1024;
    this.tiposMimeImagemPermitidos = new Set(
      this.configService
        .get<string>('TIPOS_MIME_PERMITIDOS_IMAGEM', '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );
  }

  async gerarUrlPreAssinada(dto: GerarUrlPreAssinadaDto, usuarioId: number) {
    this.validarMimeParaDestino(dto.tipo_destino, dto.tipo_mime);
    await this.validarExistenciaDestino(dto);

    const chave = this.gerarChave(dto);
    const resultado = await this.s3Service.obterUrlPreAssinada({
      chave,
      operacao: 'putObject',
      tipo_conteudo: dto.tipo_mime,
      metadados: {
        tipo_destino: dto.tipo_destino,
      },
    });

    const expiraEm = new Date(Date.now() + resultado.expira_em * 1000);
    await this.prisma.intencaoUpload.create({
      data: {
        bucket: this.s3Service.obterBucketPadrao(),
        chave_s3: resultado.chave,
        tipo_destino: dto.tipo_destino,
        nome_arquivo: dto.nome_arquivo,
        tipo_mime: dto.tipo_mime,
        ordem_servico_id: dto.ordem_servico_id,
        item_ordem_servico_id: dto.item_ordem_servico_id,
        cliente_id: dto.cliente_id,
        fatura_id: dto.fatura_id,
        usuario_solicitante_id: usuarioId,
        expira_em: expiraEm,
      },
    });

    this.logger.log(`URL pre-assinada criada para ${dto.tipo_destino}: ${chave}`);

    return {
      ...resultado,
      url_publica: this.s3Service.obterUrlObjeto(resultado.chave),
      bucket: this.s3Service.obterBucketPadrao(),
    };
  }

  async confirmarImagemAdicionalOrdem(
    dto: ConfirmarImagemOrdemServicoDto,
    usuarioId: number,
  ) {
    const upload = await this.confirmarUpload({
      tipo_destino: TipoDestinoUpload.IMAGEM_ADICIONAL_ORDEM,
      ordem_servico_id: dto.ordem_servico_id,
      chave_s3: dto.chave_s3,
      nome_arquivo: dto.nome_arquivo,
      tipo_mime: dto.tipo_mime,
      tamanho_bytes: dto.tamanho_bytes,
    });

    return this.prisma.imagemOrdemServico.create({
      data: {
        ordem_servico_id: dto.ordem_servico_id,
        criado_por_id: usuarioId,
        chave_s3: upload.chave_s3,
        url_arquivo: upload.url_arquivo,
        nome_arquivo: upload.nome_arquivo,
        tipo_mime: upload.tipo_mime,
        tamanho_bytes: upload.tamanho_bytes ?? dto.tamanho_bytes,
        ordem_exibicao: dto.ordem_exibicao ?? 0,
        rotulo: dto.rotulo,
      },
    });
  }

  async confirmarArquivoCliente(
    dto: ConfirmarArquivoClienteDto,
    usuarioId: number,
  ) {
    const upload = await this.confirmarUpload({
      tipo_destino: TipoDestinoUpload.ARQUIVO_CLIENTE,
      cliente_id: dto.cliente_id,
      chave_s3: dto.chave_s3,
      nome_arquivo: dto.nome_arquivo,
      tipo_mime: dto.tipo_mime,
      tamanho_bytes: dto.tamanho_bytes,
    });

    return this.prisma.arquivoCliente.create({
      data: {
        cliente_id: dto.cliente_id,
        criado_por_id: usuarioId,
        chave_s3: upload.chave_s3,
        url_arquivo: upload.url_arquivo,
        nome_arquivo: upload.nome_arquivo,
        tipo_mime: upload.tipo_mime,
        tamanho_bytes: upload.tamanho_bytes ?? dto.tamanho_bytes,
        rotulo: dto.rotulo,
      },
    });
  }

  async confirmarAssinaturaOrdem(
    dto: ConfirmarAssinaturaOrdemServicoDto,
    usuarioId: number,
  ) {
    const upload = await this.confirmarUpload({
      tipo_destino: TipoDestinoUpload.ASSINATURA_CLIENTE,
      ordem_servico_id: dto.ordem_servico_id,
      chave_s3: dto.chave_s3,
    });

    return this.prisma.ordemServico.update({
      where: { id: dto.ordem_servico_id },
      data: {
        chave_assinatura_cliente: upload.chave_s3,
        url_assinatura_cliente: upload.url_arquivo,
        assinada_em: new Date(),
        atualizado_por_id: usuarioId,
      },
    });
  }

  async confirmarFotoInicialItem(entrada: {
    ordem_servico_id: number;
    item_ordem_servico_id: number;
    chave_s3: string;
  }): Promise<UploadConfirmado> {
    return this.confirmarUpload({
      tipo_destino: TipoDestinoUpload.FOTO_INICIAL_ITEM,
      ordem_servico_id: entrada.ordem_servico_id,
      item_ordem_servico_id: entrada.item_ordem_servico_id,
      chave_s3: entrada.chave_s3,
    });
  }

  async confirmarImagemObservacao(entrada: {
    ordem_servico_id?: number;
    cliente_id?: number;
    fatura_id?: number;
    chave_s3: string;
    nome_arquivo: string;
    tipo_mime: string;
    tamanho_bytes: number;
  }): Promise<UploadConfirmado> {
    return this.confirmarUpload({
      tipo_destino: TipoDestinoUpload.IMAGEM_OBSERVACAO,
      ordem_servico_id: entrada.ordem_servico_id,
      cliente_id: entrada.cliente_id,
      fatura_id: entrada.fatura_id,
      chave_s3: entrada.chave_s3,
      nome_arquivo: entrada.nome_arquivo,
      tipo_mime: entrada.tipo_mime,
      tamanho_bytes: entrada.tamanho_bytes,
    });
  }

  obterExemploCorsBucket() {
    return {
      origem_recomendada: ['http://localhost:3000', 'http://localhost:5173'],
      metodos: ['GET', 'PUT', 'HEAD'],
      cabecalhos_permitidos: ['*'],
      cabecalhos_expostos: ['ETag'],
      max_age_segundos: 3000,
      exemplo_aws: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedOrigins: ['http://localhost:3000', 'http://localhost:5173'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3000,
        },
      ],
    };
  }

  private async confirmarUpload(
    entrada: ConfirmacaoUploadInterna,
  ): Promise<UploadConfirmado> {
    if (entrada.tipo_mime) {
      this.validarMimeParaDestino(entrada.tipo_destino, entrada.tipo_mime);
    }
    if (entrada.tamanho_bytes !== undefined) {
      this.validarTamanhoArquivo(entrada.tamanho_bytes);
    }

    const prefixoEsperado = this.resolverPrefixoPorContexto(entrada);
    this.validarChaveEsperada(entrada.chave_s3, prefixoEsperado);
    await this.validarExistenciaDestino(entrada);

    const intencao = await this.prisma.intencaoUpload.findUnique({
      where: { chave_s3: entrada.chave_s3 },
    });

    if (!intencao || !intencao.ativo || intencao.data_exclusao) {
      throw new BadRequestException(
        'Nao existe intencao de upload valida para a chave informada.',
      );
    }

    if (intencao.expira_em.getTime() <= Date.now()) {
      throw new BadRequestException(
        'A intencao de upload expirou. Gere uma nova URL pre-assinada.',
      );
    }

    this.validarCompatibilidadeIntencao(intencao, entrada);

    const metadadosObjeto = await this.s3Service.obterMetadadosObjeto(
      entrada.chave_s3,
      intencao.bucket,
    );

    if (!metadadosObjeto) {
      throw new BadRequestException(
        'O objeto ainda nao foi localizado no S3 para confirmacao.',
      );
    }

    if (
      intencao.tipo_mime &&
      metadadosObjeto.tipo_conteudo &&
      metadadosObjeto.tipo_conteudo !== intencao.tipo_mime
    ) {
      throw new BadRequestException(
        'O tipo MIME do objeto no S3 nao corresponde a intencao registrada.',
      );
    }

    if (
      entrada.tipo_mime &&
      metadadosObjeto.tipo_conteudo &&
      metadadosObjeto.tipo_conteudo !== entrada.tipo_mime
    ) {
      throw new BadRequestException(
        'O tipo MIME informado nao corresponde ao objeto enviado para o S3.',
      );
    }

    if (
      entrada.tamanho_bytes !== undefined &&
      metadadosObjeto.tamanho_bytes !== undefined &&
      metadadosObjeto.tamanho_bytes !== entrada.tamanho_bytes
    ) {
      throw new BadRequestException(
        'O tamanho informado nao corresponde ao objeto enviado para o S3.',
      );
    }

    if (!intencao.confirmado_em) {
      await this.prisma.intencaoUpload.update({
        where: { id: intencao.id },
        data: { confirmado_em: new Date() },
      });
    }

    return {
      bucket: intencao.bucket,
      chave_s3: entrada.chave_s3,
      nome_arquivo: intencao.nome_arquivo,
      tipo_mime: intencao.tipo_mime,
      tamanho_bytes: metadadosObjeto.tamanho_bytes,
      url_arquivo: this.s3Service.obterUrlObjeto(entrada.chave_s3, intencao.bucket),
    };
  }

  private async validarExistenciaDestino(
    dto: ContextoUpload | GerarUrlPreAssinadaDto,
  ): Promise<void> {
    switch (dto.tipo_destino) {
      case TipoDestinoUpload.FOTO_INICIAL_ITEM: {
        this.exigir(dto.ordem_servico_id, 'ordem_servico_id');
        this.exigir(dto.item_ordem_servico_id, 'item_ordem_servico_id');
        await this.validarOrdemServicoAtiva(dto.ordem_servico_id);

        const item = await this.prisma.itemOrdemServico.findUnique({
          where: { id: dto.item_ordem_servico_id },
          select: {
            id: true,
            ordem_servico_id: true,
            ativo: true,
            data_exclusao: true,
          },
        });

        if (!item || !item.ativo || item.data_exclusao) {
          throw new NotFoundException('Item da ordem de servico nao encontrado.');
        }

        if (item.ordem_servico_id !== dto.ordem_servico_id) {
          throw new BadRequestException(
            'O item informado nao pertence a ordem de servico recebida.',
          );
        }
        return;
      }
      case TipoDestinoUpload.IMAGEM_ADICIONAL_ORDEM:
      case TipoDestinoUpload.ASSINATURA_CLIENTE:
      case TipoDestinoUpload.PDF_ORDEM_SERVICO: {
        this.exigir(dto.ordem_servico_id, 'ordem_servico_id');
        await this.validarOrdemServicoAtiva(dto.ordem_servico_id);
        return;
      }
      case TipoDestinoUpload.ARQUIVO_CLIENTE: {
        this.exigir(dto.cliente_id, 'cliente_id');
        await this.validarClienteAtivo(dto.cliente_id);
        return;
      }
      case TipoDestinoUpload.PDF_FATURA: {
        this.exigir(dto.fatura_id, 'fatura_id');
        await this.validarFaturaAtiva(dto.fatura_id);
        return;
      }
      case TipoDestinoUpload.IMAGEM_OBSERVACAO: {
        if (dto.ordem_servico_id) {
          await this.validarOrdemServicoAtiva(dto.ordem_servico_id);
          return;
        }
        if (dto.cliente_id) {
          await this.validarClienteAtivo(dto.cliente_id);
          return;
        }
        if (dto.fatura_id) {
          await this.validarFaturaAtiva(dto.fatura_id);
          return;
        }
        throw new BadRequestException(
          'Informe ordem_servico_id, cliente_id ou fatura_id para imagem de observacao.',
        );
      }
      default:
        throw new BadRequestException('Tipo de destino de upload nao suportado.');
    }
  }

  private async validarOrdemServicoAtiva(id: number): Promise<void> {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id },
      select: { id: true, ativo: true, data_exclusao: true },
    });

    if (!ordem || !ordem.ativo || ordem.data_exclusao) {
      throw new NotFoundException('Ordem de servico nao encontrada.');
    }
  }

  private async validarClienteAtivo(id: number): Promise<void> {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      select: { id: true, ativo: true, data_exclusao: true },
    });

    if (!cliente || !cliente.ativo || cliente.data_exclusao) {
      throw new NotFoundException('Cliente nao encontrado.');
    }
  }

  private async validarFaturaAtiva(id: number): Promise<void> {
    const fatura = await this.prisma.fatura.findUnique({
      where: { id },
      select: { id: true, ativo: true, data_exclusao: true },
    });

    if (!fatura || !fatura.ativo || fatura.data_exclusao) {
      throw new NotFoundException('Fatura nao encontrada.');
    }
  }

  private validarCompatibilidadeIntencao(
    intencao: {
      tipo_destino: string;
      ordem_servico_id: number | null;
      item_ordem_servico_id: number | null;
      cliente_id: number | null;
      fatura_id: number | null;
      nome_arquivo: string;
      tipo_mime: string;
    },
    entrada: ConfirmacaoUploadInterna,
  ): void {
    if (intencao.tipo_destino !== entrada.tipo_destino) {
      throw new BadRequestException(
        'A intencao de upload nao corresponde ao tipo de destino informado.',
      );
    }

    if ((intencao.ordem_servico_id ?? undefined) !== entrada.ordem_servico_id) {
      throw new BadRequestException(
        'A intencao de upload nao pertence a ordem de servico informada.',
      );
    }

    if ((intencao.item_ordem_servico_id ?? undefined) !== entrada.item_ordem_servico_id) {
      throw new BadRequestException(
        'A intencao de upload nao pertence ao item informado.',
      );
    }

    if ((intencao.cliente_id ?? undefined) !== entrada.cliente_id) {
      throw new BadRequestException(
        'A intencao de upload nao pertence ao cliente informado.',
      );
    }

    if ((intencao.fatura_id ?? undefined) !== entrada.fatura_id) {
      throw new BadRequestException(
        'A intencao de upload nao pertence a fatura informada.',
      );
    }

    if (
      entrada.nome_arquivo &&
      this.normalizarNomeArquivo(intencao.nome_arquivo) !==
        this.normalizarNomeArquivo(entrada.nome_arquivo)
    ) {
      throw new BadRequestException(
        'O nome do arquivo nao corresponde a intencao de upload registrada.',
      );
    }

    if (
      entrada.tipo_mime &&
      intencao.tipo_mime.trim().toLowerCase() !== entrada.tipo_mime.trim().toLowerCase()
    ) {
      throw new BadRequestException(
        'O tipo MIME nao corresponde a intencao de upload registrada.',
      );
    }
  }

  private gerarChave(dto: GerarUrlPreAssinadaDto): string {
    const nomeArquivo = this.normalizarNomeArquivo(dto.nome_arquivo);
    const prefixo = this.resolverPrefixoPorContexto(dto);
    return `${prefixo}/${Date.now()}-${randomUUID()}-${nomeArquivo}`;
  }

  private resolverPrefixoPorContexto(dto: ContextoUpload | GerarUrlPreAssinadaDto): string {
    switch (dto.tipo_destino) {
      case TipoDestinoUpload.FOTO_INICIAL_ITEM:
        this.exigir(dto.ordem_servico_id, 'ordem_servico_id');
        this.exigir(dto.item_ordem_servico_id, 'item_ordem_servico_id');
        return `ordens/${dto.ordem_servico_id}/itens/${dto.item_ordem_servico_id}`;
      case TipoDestinoUpload.IMAGEM_OBSERVACAO:
        if (dto.ordem_servico_id) {
          return `ordens/${dto.ordem_servico_id}/observacoes`;
        }
        if (dto.cliente_id) {
          return `clientes/${dto.cliente_id}/observacoes`;
        }
        if (dto.fatura_id) {
          return `faturas/${dto.fatura_id}/observacoes`;
        }
        throw new BadRequestException(
          'Informe ordem_servico_id, cliente_id ou fatura_id para imagem de observacao.',
        );
      case TipoDestinoUpload.IMAGEM_ADICIONAL_ORDEM:
        this.exigir(dto.ordem_servico_id, 'ordem_servico_id');
        return `ordens/${dto.ordem_servico_id}/imagens-adicionais`;
      case TipoDestinoUpload.ASSINATURA_CLIENTE:
        this.exigir(dto.ordem_servico_id, 'ordem_servico_id');
        return `ordens/${dto.ordem_servico_id}/assinaturas`;
      case TipoDestinoUpload.ARQUIVO_CLIENTE:
        this.exigir(dto.cliente_id, 'cliente_id');
        return `clientes/${dto.cliente_id}/arquivos`;
      case TipoDestinoUpload.PDF_ORDEM_SERVICO:
        this.exigir(dto.ordem_servico_id, 'ordem_servico_id');
        return `ordens/${dto.ordem_servico_id}/documentos`;
      case TipoDestinoUpload.PDF_FATURA:
        this.exigir(dto.fatura_id, 'fatura_id');
        return `faturas/${dto.fatura_id}/pdf`;
      default:
        throw new BadRequestException('Tipo de destino de upload nao suportado.');
    }
  }

  private normalizarNomeArquivo(nomeArquivo: string): string {
    return nomeArquivo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  private exigir(valor: number | undefined, campo: string): asserts valor is number {
    if (!valor) {
      throw new BadRequestException(`O campo ${campo} e obrigatorio para este upload.`);
    }
  }

  private validarChaveEsperada(chave: string, prefixoEsperado: string): void {
    const chaveNormalizada = chave.trim().replace(/^\/+/, '');
    const prefixoNormalizado = prefixoEsperado.trim().replace(/^\/+/, '');

    if (!chaveNormalizada.startsWith(`${prefixoNormalizado}/`)) {
      throw new BadRequestException(
        `A chave S3 informada nao pertence ao prefixo permitido: ${prefixoNormalizado}.`,
      );
    }
  }

  private validarMimeParaDestino(
    tipoDestino: TipoDestinoUpload,
    tipoMime: string,
  ): void {
    const mimeNormalizado = tipoMime.trim().toLowerCase();
    const eMimeImagemPermitido = this.tiposMimeImagemPermitidos.has(mimeNormalizado);

    switch (tipoDestino) {
      case TipoDestinoUpload.FOTO_INICIAL_ITEM:
      case TipoDestinoUpload.IMAGEM_OBSERVACAO:
      case TipoDestinoUpload.IMAGEM_ADICIONAL_ORDEM:
      case TipoDestinoUpload.ASSINATURA_CLIENTE:
        if (!eMimeImagemPermitido) {
          throw new BadRequestException(
            `Tipo MIME nao permitido para imagem: ${mimeNormalizado}.`,
          );
        }
        return;
      case TipoDestinoUpload.PDF_ORDEM_SERVICO:
      case TipoDestinoUpload.PDF_FATURA:
        if (mimeNormalizado !== 'application/pdf') {
          throw new BadRequestException(
            `Tipo MIME nao permitido para PDF: ${mimeNormalizado}.`,
          );
        }
        return;
      case TipoDestinoUpload.ARQUIVO_CLIENTE:
        if (!eMimeImagemPermitido && mimeNormalizado !== 'application/pdf') {
          throw new BadRequestException(
            `Tipo MIME nao permitido para arquivo de cliente: ${mimeNormalizado}.`,
          );
        }
        return;
      default:
        throw new BadRequestException('Tipo de destino de upload nao suportado.');
    }
  }

  private validarTamanhoArquivo(tamanhoBytes: number): void {
    if (tamanhoBytes > this.limiteArquivoBytes) {
      throw new BadRequestException(
        `O arquivo excede o limite configurado de ${Math.round(
          this.limiteArquivoBytes / (1024 * 1024),
        )} MB.`,
      );
    }
  }
}

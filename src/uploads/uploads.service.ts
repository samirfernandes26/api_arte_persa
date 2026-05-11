import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { TipoDestinoUpload } from '../comum/enums/tipo-destino-upload.enum';
import { GerarUrlPreAssinadaDto } from './dto/gerar-url-pre-assinada.dto';
import {
  ConfirmarArquivoClienteDto,
  ConfirmarAssinaturaOrdemServicoDto,
  ConfirmarImagemOrdemServicoDto,
} from './dto/confirmar-upload.dto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly limiteArquivoBytes: number;
  private readonly tiposMimeImagemPermitidos: Set<string>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
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

  async gerarUrlPreAssinada(dto: GerarUrlPreAssinadaDto) {
    this.validarMimeParaDestino(dto.tipo_destino, dto.tipo_mime);
    const chave = this.gerarChave(dto);
    const resultado = await this.s3Service.obterUrlPreAssinada({
      chave,
      operacao: 'putObject',
      tipo_conteudo: dto.tipo_mime,
      metadados: {
        tipo_destino: dto.tipo_destino,
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
    usuarioId: string,
  ) {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id: dto.ordem_servico_id },
      select: { id: true, ativo: true, data_exclusao: true },
    });

    if (!ordem || !ordem.ativo || ordem.data_exclusao) {
      throw new NotFoundException('Ordem de servico nao encontrada.');
    }

    this.validarMimeParaDestino(
      TipoDestinoUpload.IMAGEM_ADICIONAL_ORDEM,
      dto.tipo_mime,
    );
    this.validarTamanhoArquivo(dto.tamanho_bytes);
    this.validarChaveEsperada(
      dto.chave_s3,
      `ordens/${dto.ordem_servico_id}/imagens-adicionais`,
    );

    return this.prisma.imagemOrdemServico.create({
      data: {
        ordem_servico_id: dto.ordem_servico_id,
        criado_por_id: usuarioId,
        chave_s3: dto.chave_s3,
        url_arquivo: dto.url_arquivo ?? this.s3Service.obterUrlObjeto(dto.chave_s3),
        nome_arquivo: dto.nome_arquivo,
        tipo_mime: dto.tipo_mime,
        tamanho_bytes: dto.tamanho_bytes,
        ordem_exibicao: dto.ordem_exibicao ?? 0,
        rotulo: dto.rotulo,
      },
    });
  }

  async confirmarArquivoCliente(
    dto: ConfirmarArquivoClienteDto,
    usuarioId: string,
  ) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.cliente_id },
      select: { id: true, ativo: true, data_exclusao: true },
    });

    if (!cliente || !cliente.ativo || cliente.data_exclusao) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    this.validarMimeParaDestino(TipoDestinoUpload.ARQUIVO_CLIENTE, dto.tipo_mime);
    this.validarTamanhoArquivo(dto.tamanho_bytes);
    this.validarChaveEsperada(dto.chave_s3, `clientes/${dto.cliente_id}/arquivos`);

    return this.prisma.arquivoCliente.create({
      data: {
        cliente_id: dto.cliente_id,
        criado_por_id: usuarioId,
        chave_s3: dto.chave_s3,
        url_arquivo: dto.url_arquivo ?? this.s3Service.obterUrlObjeto(dto.chave_s3),
        nome_arquivo: dto.nome_arquivo,
        tipo_mime: dto.tipo_mime,
        tamanho_bytes: dto.tamanho_bytes,
        rotulo: dto.rotulo,
      },
    });
  }

  async confirmarAssinaturaOrdem(
    dto: ConfirmarAssinaturaOrdemServicoDto,
    usuarioId: string,
  ) {
    const ordem = await this.prisma.ordemServico.findUnique({
      where: { id: dto.ordem_servico_id },
      select: { id: true, ativo: true, data_exclusao: true },
    });

    if (!ordem || !ordem.ativo || ordem.data_exclusao) {
      throw new NotFoundException('Ordem de servico nao encontrada.');
    }

    this.validarChaveEsperada(
      dto.chave_s3,
      `ordens/${dto.ordem_servico_id}/assinaturas`,
    );

    return this.prisma.ordemServico.update({
      where: { id: dto.ordem_servico_id },
      data: {
        chave_assinatura_cliente: dto.chave_s3,
        url_assinatura_cliente:
          dto.url_arquivo ?? this.s3Service.obterUrlObjeto(dto.chave_s3),
        assinada_em: new Date(),
        atualizado_por_id: usuarioId,
      },
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

  private gerarChave(dto: GerarUrlPreAssinadaDto): string {
    const nomeArquivo = this.normalizarNomeArquivo(dto.nome_arquivo);
    const prefixo = this.resolverPrefixo(dto);
    return `${prefixo}/${Date.now()}-${randomUUID()}-${nomeArquivo}`;
  }

  private resolverPrefixo(dto: GerarUrlPreAssinadaDto): string {
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

  private exigir(valor: string | undefined, campo: string): asserts valor is string {
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

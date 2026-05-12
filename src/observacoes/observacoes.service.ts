import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ServicoPrisma } from '../prisma/prisma.service';
import { PayloadAutenticacao } from '../comum/interfaces/payload-token.interface';
import { TipoAlvoObservacao } from '../comum/enums/tipo-alvo-observacao.enum';
import { ServicoUploads } from '../uploads/uploads.service';
import { AdicionarObservacaoDto } from './dto/adicionar-observacao.dto';

@Injectable()
export class ObservacoesService {
  constructor(
    private readonly prisma: ServicoPrisma,
    private readonly uploadsService: ServicoUploads,
  ) {}

  async adicionar(dto: AdicionarObservacaoDto, usuarioAtual: PayloadAutenticacao) {
    this.validarAlvo(dto);
    const referencias = await this.validarExistenciaAlvo(dto);
    const imagensValidadas = dto.imagens?.length
      ? await Promise.all(
          dto.imagens.map((imagem) =>
            this.uploadsService.confirmarImagemObservacao({
              ordem_servico_id: referencias.ordem_servico_id_upload,
              cliente_id: dto.cliente_id,
              fatura_id: dto.fatura_id,
              chave_s3: imagem.chave_s3,
              nome_arquivo: imagem.nome_arquivo,
              tipo_mime: imagem.tipo_mime,
              tamanho_bytes: imagem.tamanho_bytes,
            }),
          ),
        )
      : [];

    return this.prisma.observacao.create({
      data: {
        tipo_alvo: dto.tipo_alvo,
        ordem_servico_id: dto.ordem_servico_id,
        item_ordem_servico_id: dto.item_ordem_servico_id,
        cliente_id: dto.cliente_id,
        fatura_id: dto.fatura_id,
        criado_por_id: usuarioAtual.sub,
        atualizado_por_id: usuarioAtual.sub,
        visibilidade: dto.visibilidade,
        titulo: dto.titulo,
        conteudo: dto.conteudo,
        imagens: imagensValidadas.length
          ? {
              create: imagensValidadas.map((imagem, indice) => ({
                criado_por_id: usuarioAtual.sub,
                atualizado_por_id: usuarioAtual.sub,
                chave_s3: imagem.chave_s3,
                url_arquivo: imagem.url_arquivo,
                nome_arquivo: imagem.nome_arquivo,
                tipo_mime: imagem.tipo_mime,
                tamanho_bytes:
                  imagem.tamanho_bytes ?? dto.imagens?.[indice]?.tamanho_bytes ?? 0,
                posicao: dto.imagens?.[indice]?.posicao ?? indice,
              })),
            }
          : undefined,
      },
      include: this.includeCompleto(),
    });
  }

  async listarPorOrdemServico(ordemServicoId: string) {
    return this.prisma.observacao.findMany({
      where: {
        ordem_servico_id: ordemServicoId,
        ativo: true,
        data_exclusao: null,
      },
      include: this.includeCompleto(),
      orderBy: { data_criacao: 'desc' },
    });
  }

  async listarPorItem(itemId: string) {
    return this.prisma.observacao.findMany({
      where: {
        item_ordem_servico_id: itemId,
        ativo: true,
        data_exclusao: null,
      },
      include: this.includeCompleto(),
      orderBy: { data_criacao: 'desc' },
    });
  }

  async listarPorCliente(clienteId: string) {
    return this.prisma.observacao.findMany({
      where: {
        cliente_id: clienteId,
        ativo: true,
        data_exclusao: null,
      },
      include: this.includeCompleto(),
      orderBy: { data_criacao: 'desc' },
    });
  }

  async listarPorFatura(faturaId: string) {
    return this.prisma.observacao.findMany({
      where: {
        fatura_id: faturaId,
        ativo: true,
        data_exclusao: null,
      },
      include: this.includeCompleto(),
      orderBy: { data_criacao: 'desc' },
    });
  }

  async buscarPorId(id: string) {
    const observacao = await this.prisma.observacao.findUnique({
      where: { id },
      include: this.includeCompleto(),
    });

    if (!observacao || !observacao.ativo || observacao.data_exclusao) {
      throw new NotFoundException('Observacao nao encontrada.');
    }

    return observacao;
  }

  private validarAlvo(dto: AdicionarObservacaoDto) {
    const preenchidos = [
      dto.ordem_servico_id ? 'ordem_servico_id' : null,
      dto.item_ordem_servico_id ? 'item_ordem_servico_id' : null,
      dto.cliente_id ? 'cliente_id' : null,
      dto.fatura_id ? 'fatura_id' : null,
    ].filter(Boolean);

    if (preenchidos.length !== 1) {
      throw new BadRequestException(
        'Informe exatamente um alvo para a observacao.',
      );
    }

    const campoEsperado =
      dto.tipo_alvo === TipoAlvoObservacao.ORDEM_SERVICO
        ? 'ordem_servico_id'
        : dto.tipo_alvo === TipoAlvoObservacao.ITEM_ORDEM_SERVICO
          ? 'item_ordem_servico_id'
          : dto.tipo_alvo === TipoAlvoObservacao.CLIENTE
            ? 'cliente_id'
            : 'fatura_id';

    if (!preenchidos.includes(campoEsperado)) {
      throw new BadRequestException(
        `O tipo_alvo ${dto.tipo_alvo} exige o campo ${campoEsperado}.`,
      );
    }
  }

  private async validarExistenciaAlvo(dto: AdicionarObservacaoDto) {
    let ordemServicoIdUpload = dto.ordem_servico_id ?? undefined;

    if (dto.ordem_servico_id) {
      const ordem = await this.prisma.ordemServico.findUnique({
        where: { id: dto.ordem_servico_id },
        select: { id: true, ativo: true, data_exclusao: true },
      });

      if (!ordem || !ordem.ativo || ordem.data_exclusao) {
        throw new NotFoundException('Ordem de servico nao encontrada.');
      }
    }

    if (dto.item_ordem_servico_id) {
      const item = await this.prisma.itemOrdemServico.findUnique({
        where: { id: dto.item_ordem_servico_id },
        select: {
          id: true,
          ativo: true,
          data_exclusao: true,
          ordem_servico_id: true,
        },
      });

      if (!item || !item.ativo || item.data_exclusao) {
        throw new NotFoundException('Item da ordem de servico nao encontrado.');
      }

      ordemServicoIdUpload = item.ordem_servico_id;
    }

    if (dto.cliente_id) {
      const cliente = await this.prisma.cliente.findUnique({
        where: { id: dto.cliente_id },
        select: { id: true, ativo: true, data_exclusao: true },
      });

      if (!cliente || !cliente.ativo || cliente.data_exclusao) {
        throw new NotFoundException('Cliente nao encontrado.');
      }
    }

    if (dto.fatura_id) {
      const fatura = await this.prisma.fatura.findUnique({
        where: { id: dto.fatura_id },
        select: {
          id: true,
          ativo: true,
          data_exclusao: true,
          ordem_servico_id: true,
        },
      });

      if (!fatura || !fatura.ativo || fatura.data_exclusao) {
        throw new NotFoundException('Fatura nao encontrada.');
      }

      ordemServicoIdUpload = fatura.ordem_servico_id;
    }

    return {
      ordem_servico_id_upload: ordemServicoIdUpload,
    };
  }

  private includeCompleto() {
    return {
      criado_por: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
      atualizado_por: {
        select: { id: true, nome: true, email: true, perfil: true },
      },
      imagens: {
        where: { ativo: true, data_exclusao: null },
        orderBy: { posicao: 'asc' as const },
      },
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ServicoPrisma } from '../prisma/prisma.service';
import { ServicoUploads } from '../uploads/uploads.service';
import { AtualizarItemOrdemServicoDto } from './dto/atualizar-item-ordem-servico.dto';

@Injectable()
export class ItensService {
  constructor(
    private readonly prisma: ServicoPrisma,
    private readonly uploadsService: ServicoUploads,
  ) {}

  async listarPorOrdemServico(ordemServicoId: string) {
    return this.prisma.itemOrdemServico.findMany({
      where: {
        ordem_servico_id: ordemServicoId,
        ativo: true,
        data_exclusao: null,
      },
      include: {
        servicos_executados: {
          where: { ativo: true, data_exclusao: null },
        },
      },
      orderBy: { data_criacao: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const item = await this.prisma.itemOrdemServico.findUnique({
      where: { id },
      include: {
        servicos_executados: {
          where: { ativo: true, data_exclusao: null },
        },
      },
    });

    if (!item || !item.ativo || item.data_exclusao) {
      throw new NotFoundException('Item da ordem de servico nao encontrado.');
    }

    return item;
  }

  async atualizar(id: string, dto: AtualizarItemOrdemServicoDto, usuarioId: string) {
    const itemAtual = await this.buscarPorId(id);

    const fotoInicialConfirmada =
      dto.chave_foto_inicial !== undefined
        ? await this.uploadsService.confirmarFotoInicialItem({
            ordem_servico_id: itemAtual.ordem_servico_id,
            item_ordem_servico_id: itemAtual.id,
            chave_s3: dto.chave_foto_inicial,
          })
        : undefined;

    return this.prisma.itemOrdemServico.update({
      where: { id },
      data: {
        estado_atual: dto.estado_atual,
        cuidados_especiais: dto.cuidados_especiais,
        chave_foto_inicial: fotoInicialConfirmada?.chave_s3,
        url_foto_inicial: fotoInicialConfirmada?.url_arquivo,
        valor_declarado: dto.valor_declarado,
        atualizado_por_id: usuarioId,
      },
      include: {
        servicos_executados: {
          where: { ativo: true, data_exclusao: null },
        },
      },
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AtualizarItemOrdemServicoDto } from './dto/atualizar-item-ordem-servico.dto';

@Injectable()
export class ItensService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.buscarPorId(id);

    return this.prisma.itemOrdemServico.update({
      where: { id },
      data: {
        estado_atual: dto.estado_atual,
        cuidados_especiais: dto.cuidados_especiais,
        chave_foto_inicial: dto.chave_foto_inicial,
        url_foto_inicial: dto.url_foto_inicial,
        valor_declarado: dto.valor_declarado,
        atualizado_por_id: usuarioId,
      },
    });
  }
}

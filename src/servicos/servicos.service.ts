import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { CriarServicoDto } from './dto/criar-servico.dto';
import { AtualizarServicoDto } from './dto/atualizar-servico.dto';

@Injectable()
export class ServicosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarServicoDto, usuarioId: string) {
    return this.prisma.servicoCatalogo.create({
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        categoria: dto.categoria,
        preco_base: dto.preco_base,
        unidade_cobranca: dto.unidade_cobranca,
        prazo_medio_dias: dto.prazo_medio_dias,
        criado_por_id: usuarioId,
        atualizado_por_id: usuarioId,
      },
    });
  }

  async listar(consulta: PaginacaoConsultaDto) {
    const pagina = consulta.pagina ?? 1;
    const limite = consulta.limite ?? 20;

    return this.prisma.servicoCatalogo.findMany({
      where: {
        ativo: true,
        data_exclusao: null,
        OR: consulta.busca
          ? [
              { nome: { contains: consulta.busca } },
              { categoria: { contains: consulta.busca } },
            ]
          : undefined,
      },
      orderBy: { nome: 'asc' },
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  async buscarPorId(id: string) {
    const servico = await this.prisma.servicoCatalogo.findUnique({ where: { id } });
    if (!servico || !servico.ativo || servico.data_exclusao) {
      throw new NotFoundException('Servico nao encontrado.');
    }

    return servico;
  }

  async atualizar(id: string, dto: AtualizarServicoDto, usuarioId: string) {
    await this.buscarPorId(id);
    return this.prisma.servicoCatalogo.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        categoria: dto.categoria,
        preco_base: dto.preco_base,
        unidade_cobranca: dto.unidade_cobranca,
        prazo_medio_dias: dto.prazo_medio_dias,
        atualizado_por_id: usuarioId,
      },
    });
  }
}

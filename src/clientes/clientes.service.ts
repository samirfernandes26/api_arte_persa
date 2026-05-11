import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CriarClienteDto, usuarioId: string) {
    return this.prisma.cliente.create({
      data: {
        tipo_pessoa: dto.tipo_pessoa,
        documento: dto.documento,
        nome_razao_social: dto.nome_razao_social,
        nome_fantasia_apelido: dto.nome_fantasia_apelido,
        email_principal: dto.email_principal,
        telefone_principal: dto.telefone_principal,
        observacoes_internas: dto.observacoes_internas,
        criado_por_id: usuarioId,
        atualizado_por_id: usuarioId,
        contatos: dto.contatos?.length
          ? {
              create: dto.contatos.map((contato) => ({
                nome: contato.nome,
                setor: contato.setor,
                cargo: contato.cargo,
                tipo_contato: contato.tipo_contato,
                valor: contato.valor,
                principal: contato.principal ?? false,
              })),
            }
          : undefined,
        enderecos: dto.enderecos?.length
          ? {
              create: dto.enderecos.map((endereco) => ({
                tipo_endereco: endereco.tipo_endereco,
                rotulo: endereco.rotulo,
                destinatario: endereco.destinatario,
                cep: endereco.cep,
                logradouro: endereco.logradouro,
                numero: endereco.numero,
                complemento: endereco.complemento,
                bairro: endereco.bairro,
                cidade: endereco.cidade,
                estado: endereco.estado,
                principal: endereco.principal ?? false,
              })),
            }
          : undefined,
      },
      include: {
        contatos: true,
        enderecos: true,
      },
    });
  }

  async listar(consulta: PaginacaoConsultaDto) {
    const pagina = consulta.pagina ?? 1;
    const limite = consulta.limite ?? 20;

    return this.prisma.cliente.findMany({
      where: {
        ativo: true,
        data_exclusao: null,
        OR: consulta.busca
          ? [
              { nome_razao_social: { contains: consulta.busca } },
              { nome_fantasia_apelido: { contains: consulta.busca } },
              { documento: { contains: consulta.busca } },
            ]
          : undefined,
      },
      include: {
        contatos: {
          where: { ativo: true, data_exclusao: null },
          orderBy: { principal: 'desc' },
        },
        enderecos: {
          where: { ativo: true, data_exclusao: null },
          orderBy: { principal: 'desc' },
        },
      },
      orderBy: { data_criacao: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
    });
  }

  async buscarPorId(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        contatos: { where: { ativo: true, data_exclusao: null } },
        enderecos: { where: { ativo: true, data_exclusao: null } },
        arquivos: { where: { ativo: true, data_exclusao: null } },
      },
    });

    if (!cliente || !cliente.ativo || cliente.data_exclusao) {
      throw new NotFoundException('Cliente nao encontrado.');
    }

    return cliente;
  }

  async atualizar(id: string, dto: AtualizarClienteDto, usuarioId: string) {
    await this.buscarPorId(id);

    return this.prisma.$transaction(async (transacao) => {
      if (dto.contatos) {
        await transacao.contatoCliente.updateMany({
          where: { cliente_id: id, ativo: true, data_exclusao: null },
          data: { ativo: false, data_exclusao: new Date() },
        });
      }

      if (dto.enderecos) {
        await transacao.enderecoCliente.updateMany({
          where: { cliente_id: id, ativo: true, data_exclusao: null },
          data: { ativo: false, data_exclusao: new Date() },
        });
      }

      return transacao.cliente.update({
        where: { id },
        data: {
          tipo_pessoa: dto.tipo_pessoa,
          documento: dto.documento,
          nome_razao_social: dto.nome_razao_social,
          nome_fantasia_apelido: dto.nome_fantasia_apelido,
          email_principal: dto.email_principal,
          telefone_principal: dto.telefone_principal,
          observacoes_internas: dto.observacoes_internas,
          atualizado_por_id: usuarioId,
          contatos: dto.contatos
            ? {
                create: dto.contatos.map((contato) => ({
                  nome: contato.nome,
                  setor: contato.setor,
                  cargo: contato.cargo,
                  tipo_contato: contato.tipo_contato,
                  valor: contato.valor,
                  principal: contato.principal ?? false,
                })),
              }
            : undefined,
          enderecos: dto.enderecos
            ? {
                create: dto.enderecos.map((endereco) => ({
                  tipo_endereco: endereco.tipo_endereco,
                  rotulo: endereco.rotulo,
                  destinatario: endereco.destinatario,
                  cep: endereco.cep,
                  logradouro: endereco.logradouro,
                  numero: endereco.numero,
                  complemento: endereco.complemento,
                  bairro: endereco.bairro,
                  cidade: endereco.cidade,
                  estado: endereco.estado,
                  principal: endereco.principal ?? false,
                })),
              }
            : undefined,
        },
        include: {
          contatos: { where: { ativo: true, data_exclusao: null } },
          enderecos: { where: { ativo: true, data_exclusao: null } },
        },
      });
    });
  }

  async obterSnapshotCliente(id: string) {
    const cliente = await this.buscarPorId(id);

    const enderecoColeta =
      cliente.enderecos.find((item) => item.principal) ?? cliente.enderecos[0] ?? null;

    return {
      cliente: {
        id: cliente.id,
        tipo_pessoa: cliente.tipo_pessoa,
        documento: cliente.documento,
        nome_razao_social: cliente.nome_razao_social,
        nome_fantasia_apelido: cliente.nome_fantasia_apelido,
        email_principal: cliente.email_principal,
        telefone_principal: cliente.telefone_principal,
      },
      endereco_padrao: enderecoColeta,
    };
  }
}

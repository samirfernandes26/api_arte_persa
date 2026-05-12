import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { normalizarDocumento } from '../comum/utilitarios/documento.util';
import { KmsService } from '../kms/kms.service';
import { ServicoPrisma } from '../prisma/prisma.service';
import { PaginacaoConsultaDto } from '../comum/dto/paginacao-consulta.dto';
import { CriarClienteDto } from './dto/criar-cliente.dto';
import { AtualizarClienteDto } from './dto/atualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: ServicoPrisma,
    private readonly kmsService: KmsService,
  ) {}

  async criar(dto: CriarClienteDto, usuarioId: string) {
    const contatosCriptografados = dto.contatos?.length
      ? await Promise.all(
          dto.contatos.map(async (contato) => ({
            criado_por_id: usuarioId,
            atualizado_por_id: usuarioId,
            nome: contato.nome,
            setor: contato.setor,
            cargo: contato.cargo,
            tipo_contato: contato.tipo_contato,
            valor:
              (await this.kmsService.encryptData(contato.valor, {
                entidade: 'cliente',
                campo: 'contato_valor',
              })) ?? contato.valor,
            principal: contato.principal ?? false,
          })),
        )
      : undefined;
    const documentoNormalizado = normalizarDocumento(dto.documento);

    const cliente = await this.prisma.cliente.create({
      data: {
        tipo_pessoa: dto.tipo_pessoa,
        documento: await this.kmsService.encryptData(documentoNormalizado, {
          entidade: 'cliente',
          campo: 'documento',
        }),
        documento_hash: this.kmsService.gerarHashDeterministico(documentoNormalizado),
        nome_razao_social: dto.nome_razao_social,
        nome_fantasia_apelido: dto.nome_fantasia_apelido,
        email_principal: await this.kmsService.encryptData(
          dto.email_principal?.toLowerCase(),
          {
            entidade: 'cliente',
            campo: 'email_principal',
          },
        ),
        telefone_principal: await this.kmsService.encryptData(dto.telefone_principal, {
          entidade: 'cliente',
          campo: 'telefone_principal',
        }),
        observacoes_internas: await this.kmsService.encryptData(
          dto.observacoes_internas,
          {
            entidade: 'cliente',
            campo: 'observacoes_internas',
          },
        ),
        criado_por_id: usuarioId,
        atualizado_por_id: usuarioId,
        contatos: contatosCriptografados?.length
          ? {
              create: contatosCriptografados,
            }
          : undefined,
        enderecos: dto.enderecos?.length
          ? {
              create: dto.enderecos.map((endereco) => ({
                criado_por_id: usuarioId,
                atualizado_por_id: usuarioId,
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

    return this.descriptografarCliente(cliente);
  }

  async listar(consulta: PaginacaoConsultaDto) {
    const pagina = consulta.pagina ?? 1;
    const limite = consulta.limite ?? 20;
    const documentoBusca = normalizarDocumento(consulta.busca);
    const hashDocumentoBusca = documentoBusca
      ? this.kmsService.gerarHashDeterministico(documentoBusca)
      : null;

    const clientes = await this.prisma.cliente.findMany({
      where: {
        ativo: true,
        data_exclusao: null,
        OR: consulta.busca
          ? [
              { nome_razao_social: { contains: consulta.busca } },
              { nome_fantasia_apelido: { contains: consulta.busca } },
              ...(hashDocumentoBusca
                ? [{ documento_hash: hashDocumentoBusca }]
                : []),
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

    return Promise.all(clientes.map((cliente) => this.descriptografarCliente(cliente)));
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

    return this.descriptografarCliente(cliente);
  }

  async atualizar(id: string, dto: AtualizarClienteDto, usuarioId: string) {
    await this.buscarPorId(id);
    const contatosCriptografados = dto.contatos
      ? await Promise.all(
          dto.contatos.map(async (contato) => ({
            nome: contato.nome,
            setor: contato.setor,
            cargo: contato.cargo,
            tipo_contato: contato.tipo_contato,
            valor:
              (await this.kmsService.encryptData(contato.valor, {
                entidade: 'cliente',
                campo: 'contato_valor',
                identificador: id,
              })) ?? contato.valor,
            principal: contato.principal ?? false,
          })),
        )
      : undefined;
    const documentoNormalizado =
      dto.documento !== undefined ? normalizarDocumento(dto.documento) : undefined;

    const cliente = await this.prisma.$transaction(async (transacao) => {
      if (dto.contatos) {
        await transacao.contatoCliente.updateMany({
          where: { cliente_id: id, ativo: true, data_exclusao: null },
          data: {
            ativo: false,
            data_exclusao: new Date(),
            atualizado_por_id: usuarioId,
          },
        });
      }

      if (dto.enderecos) {
        await transacao.enderecoCliente.updateMany({
          where: { cliente_id: id, ativo: true, data_exclusao: null },
          data: {
            ativo: false,
            data_exclusao: new Date(),
            atualizado_por_id: usuarioId,
          },
        });
      }

      return transacao.cliente.update({
        where: { id },
        data: {
          tipo_pessoa: dto.tipo_pessoa,
          documento:
            dto.documento !== undefined
              ? await this.kmsService.encryptData(documentoNormalizado, {
                  entidade: 'cliente',
                  campo: 'documento',
                  identificador: id,
                })
              : undefined,
          documento_hash:
            dto.documento !== undefined
              ? this.kmsService.gerarHashDeterministico(documentoNormalizado)
              : undefined,
          nome_razao_social: dto.nome_razao_social,
          nome_fantasia_apelido: dto.nome_fantasia_apelido,
          email_principal:
            dto.email_principal !== undefined
              ? await this.kmsService.encryptData(dto.email_principal?.toLowerCase(), {
                  entidade: 'cliente',
                  campo: 'email_principal',
                  identificador: id,
                })
              : undefined,
          telefone_principal:
            dto.telefone_principal !== undefined
              ? await this.kmsService.encryptData(dto.telefone_principal, {
                  entidade: 'cliente',
                  campo: 'telefone_principal',
                  identificador: id,
                })
              : undefined,
          observacoes_internas:
            dto.observacoes_internas !== undefined
              ? await this.kmsService.encryptData(dto.observacoes_internas, {
                  entidade: 'cliente',
                  campo: 'observacoes_internas',
                  identificador: id,
                })
              : undefined,
          atualizado_por_id: usuarioId,
          contatos: dto.contatos
            ? {
                create: contatosCriptografados?.map((contato) => ({
                  ...contato,
                  criado_por_id: usuarioId,
                  atualizado_por_id: usuarioId,
                })),
              }
            : undefined,
          enderecos: dto.enderecos
            ? {
                create: dto.enderecos.map((endereco) => ({
                  criado_por_id: usuarioId,
                  atualizado_por_id: usuarioId,
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

    return this.descriptografarCliente(cliente);
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

  private async descriptografarCliente<
    T extends {
      documento?: string | null;
      email_principal?: string | null;
      telefone_principal?: string | null;
      observacoes_internas?: string | null;
      contatos?: Array<{ valor: string }>;
    },
  >(cliente: T): Promise<T> {
    return {
      ...cliente,
      documento: (await this.kmsService.decryptData(cliente.documento)) ?? null,
      email_principal:
        (await this.kmsService.decryptData(cliente.email_principal)) ?? null,
      telefone_principal:
        (await this.kmsService.decryptData(cliente.telefone_principal)) ?? null,
      observacoes_internas:
        (await this.kmsService.decryptData(cliente.observacoes_internas)) ?? null,
      contatos: cliente.contatos
        ? await Promise.all(
            cliente.contatos.map(async (contato) => ({
              ...contato,
              valor: (await this.kmsService.decryptData(contato.valor)) ?? '',
            })),
          )
        : cliente.contatos,
    };
  }
}

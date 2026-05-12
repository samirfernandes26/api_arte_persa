import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PerfilUsuario, Prisma, Usuario } from '@prisma/client';
import { hash } from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { ServicoPrisma } from '../prisma/prisma.service';
import { CriarUsuarioDto } from './dto/criar-usuario.dto';
import { AtualizarUsuarioDto } from './dto/atualizar-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: ServicoPrisma,
    private readonly configService: ConfigService,
  ) {}

  async criarPrimeiroMaster(dto: CriarUsuarioDto): Promise<Usuario> {
    const totalUsuarios = await this.prisma.usuario.count();
    if (totalUsuarios > 0) {
      throw new BadRequestException(
        'O primeiro usuario master so pode ser criado quando o sistema estiver vazio.',
      );
    }

    return this.criar(dto, null, PerfilUsuario.master);
  }

  async criar(
    dto: CriarUsuarioDto,
    _usuarioExecutorId: string | null,
    perfilForcado?: PerfilUsuario,
  ): Promise<Usuario> {
    const existente = await this.prisma.usuario.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existente) {
      throw new ConflictException('Ja existe um usuario com este e-mail.');
    }

    return this.prisma.usuario.create({
      data: {
        nome: dto.nome,
        email: dto.email.toLowerCase(),
        senha_hash: await this.gerarHashSenha(dto.senha),
        perfil: perfilForcado ?? dto.perfil ?? PerfilUsuario.funcionario,
      },
    });
  }

  async listar() {
    return this.prisma.usuario.findMany({
      where: { ativo: true, data_exclusao: null },
      orderBy: { data_criacao: 'desc' },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
        ultimo_login_em: true,
        data_criacao: true,
      },
    });
  }

  async buscarPorId(id: string): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario || !usuario.ativo || usuario.data_exclusao) {
      throw new NotFoundException('Usuario nao encontrado.');
    }

    return usuario;
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async atualizar(
    id: string,
    dto: AtualizarUsuarioDto,
    usuarioExecutorId: string,
  ): Promise<Usuario> {
    const atual = await this.buscarPorId(id);

    if (dto.email && dto.email.toLowerCase() !== atual.email) {
      const emailEmUso = await this.prisma.usuario.findUnique({
        where: { email: dto.email.toLowerCase() },
      });

      if (emailEmUso) {
        throw new ConflictException('Ja existe um usuario com este e-mail.');
      }
    }

    const dadosAtualizacao: Prisma.UsuarioUpdateInput = {
      nome: dto.nome ?? undefined,
      email: dto.email?.toLowerCase() ?? undefined,
      perfil: dto.perfil ?? undefined,
      ativo: dto.ativo ?? undefined,
    };

    if (dto.senha) {
      dadosAtualizacao.senha_hash = await this.gerarHashSenha(dto.senha);
    }

    if (dto.ativo === false) {
      dadosAtualizacao.data_exclusao = new Date();
    } else if (dto.ativo === true) {
      dadosAtualizacao.data_exclusao = null;
    }

    void usuarioExecutorId;

    return this.prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao,
    });
  }

  private async gerarHashSenha(senha: string): Promise<string> {
    const rodadas = this.configService.get<number>('RODADAS_HASH_SENHA', 10);
    return hash(senha, rodadas);
  }
}

import { Exclude, Expose } from 'class-transformer';
import { PerfilUsuario } from '../../comum/enums/perfil-usuario.enum';

@Exclude()
export class UsuarioResumidoDto {
  @Expose()
  id!: number;

  @Expose()
  nome!: string;

  @Expose()
  email!: string;

  @Expose()
  perfil!: PerfilUsuario;

  @Expose()
  ativo!: boolean;
}

@Exclude()
export class UsuarioResponseDto extends UsuarioResumidoDto {
  @Expose()
  ultimo_login_em?: Date | null;

  @Expose()
  data_criacao?: Date;

  @Expose()
  data_atualizacao?: Date;
}

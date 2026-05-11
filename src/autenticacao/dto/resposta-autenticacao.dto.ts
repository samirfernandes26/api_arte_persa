import { Exclude, Expose, Type } from 'class-transformer';
import { UsuarioResponseDto } from '../../usuarios/dto/usuario-response.dto';

@Exclude()
export class RespostaAutenticacaoDto {
  @Expose()
  access_token!: string;

  @Expose()
  refresh_token!: string;

  @Expose()
  @Type(() => UsuarioResponseDto)
  usuario!: UsuarioResponseDto;
}

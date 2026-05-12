import { Exclude, Expose, Type } from 'class-transformer';
import { UsuarioResponseDto } from '../../usuarios/dto/usuario-response.dto';

@Exclude()
export class RespostaAutenticacaoDto {
  @Expose()
  token_acesso!: string;

  @Expose()
  token_atualizacao!: string;

  @Expose()
  @Type(() => UsuarioResponseDto)
  usuario!: UsuarioResponseDto;
}

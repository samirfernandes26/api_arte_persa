import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { TipoDestinoUpload } from '../../comum/enums/tipo-destino-upload.enum';

/**
 * Exemplo de payload:
 * {
 *   "tipo_destino": "foto_inicial_item",
 *   "ordem_servico_id": "uuid-da-ordem",
 *   "item_ordem_servico_id": "uuid-do-item",
 *   "nome_arquivo": "tapete-sala.jpg",
 *   "tipo_mime": "image/jpeg"
 * }
 *
 * Esse DTO e importante porque define em qual pasta do S3 a chave sera gerada.
 */
export class GerarUrlPreAssinadaDto {
  @IsEnum(TipoDestinoUpload)
  tipo_destino!: TipoDestinoUpload;

  @IsOptional()
  @IsUUID()
  ordem_servico_id?: string;

  @IsOptional()
  @IsUUID()
  item_ordem_servico_id?: string;

  @IsOptional()
  @IsUUID()
  observacao_id?: string;

  @IsOptional()
  @IsUUID()
  cliente_id?: string;

  @IsOptional()
  @IsUUID()
  fatura_id?: string;

  @IsString()
  @IsNotEmpty()
  nome_arquivo!: string;

  @Matches(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i, {
    message: 'Tipo MIME invalido.',
  })
  tipo_mime!: string;
}

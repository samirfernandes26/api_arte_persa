import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDestinoUpload } from '../../comum/enums/tipo-destino-upload.enum';

/**
 * Exemplo de payload:
 * {
 *   "tipo_destino": "foto_inicial_item",
 *   "ordem_servico_id": 12,
 *   "item_ordem_servico_id": 33,
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ordem_servico_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  item_ordem_servico_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cliente_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fatura_id?: number;

  @IsString()
  @IsNotEmpty()
  nome_arquivo!: string;

  @Matches(/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i, {
    message: 'Tipo MIME invalido.',
  })
  tipo_mime!: string;
}

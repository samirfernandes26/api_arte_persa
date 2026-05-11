import { SetMetadata } from '@nestjs/common';

export const CHAVE_ROTA_PUBLICA = 'rota_publica';

export const Publico = () => SetMetadata(CHAVE_ROTA_PUBLICA, true);

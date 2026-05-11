import { UploadsService } from './uploads.service';
import { TipoDestinoUpload } from '../comum/enums/tipo-destino-upload.enum';

describe('UploadsService', () => {
  const prismaMock = {
    ordemServico: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    cliente: {
      findUnique: jest.fn(),
    },
    imagemOrdemServico: {
      create: jest.fn(),
    },
    arquivoCliente: {
      create: jest.fn(),
    },
  };

  const s3Mock = {
    obterUrlPreAssinada: jest.fn(),
    obterUrlObjeto: jest.fn(),
  };

  let service: UploadsService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1710000000000);
    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
    s3Mock.obterUrlPreAssinada.mockResolvedValue({
      chave: 'qualquer',
      url: 'https://upload.exemplo',
      metodo: 'PUT',
      expira_em: 900,
      cabecalhos: {},
    });
    s3Mock.obterUrlObjeto.mockReturnValue('https://cdn.exemplo/arquivo');
    service = new UploadsService(prismaMock as never, s3Mock as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('gera URL pre-assinada na pasta correta da ordem e item', async () => {
    const uuidOrdem = '11111111-1111-1111-1111-111111111111';
    const uuidItem = '22222222-2222-2222-2222-222222222222';

    await service.gerarUrlPreAssinada({
      tipo_destino: TipoDestinoUpload.FOTO_INICIAL_ITEM,
      ordem_servico_id: uuidOrdem,
      item_ordem_servico_id: uuidItem,
      nome_arquivo: 'Foto Inicial.JPG',
      tipo_mime: 'image/jpeg',
    });

    expect(s3Mock.obterUrlPreAssinada).toHaveBeenCalledWith(
      expect.objectContaining({
        chave: expect.stringContaining(`ordens/${uuidOrdem}/itens/${uuidItem}/`),
        tipo_conteudo: 'image/jpeg',
      }),
    );
  });
});

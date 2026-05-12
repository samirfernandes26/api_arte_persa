import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { ServicoS3 } from './s3.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: S3Client,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new S3Client({
          region: configService.getOrThrow<string>('AWS_REGION'),
          endpoint: configService.get<string>('AWS_ENDPOINT') || undefined,
          forcePathStyle: configService.get<boolean>(
            'AWS_FORCE_PATH_STYLE',
            false,
          ),
          maxAttempts: configService.get<number>('AWS_MAX_ATTEMPTS', 3),
          credentials: {
            accessKeyId: configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey:
              configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
            sessionToken:
              configService.get<string>('AWS_SESSION_TOKEN') || undefined,
          },
        }),
    },
    ServicoS3,
  ],
  exports: [ServicoS3],
})
export class ModuloS3 {}

export { ModuloS3 as S3Module };

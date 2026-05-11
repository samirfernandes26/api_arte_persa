import { KMSClient } from '@aws-sdk/client-kms';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KmsService } from './kms.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KMSClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new KMSClient({
          region: configService.getOrThrow<string>('AWS_REGION'),
          endpoint: configService.get<string>('AWS_ENDPOINT') || undefined,
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
    KmsService,
  ],
  exports: [KmsService],
})
export class ModuloKms {}

export { ModuloKms as KmsModule };

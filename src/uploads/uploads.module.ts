import { Module } from '@nestjs/common';
import { S3Module } from '../s3/s3.module';
import { UploadsController } from './uploads.controller';
import { ServicoUploads } from './uploads.service';

@Module({
  imports: [S3Module],
  controllers: [UploadsController],
  providers: [ServicoUploads],
  exports: [ServicoUploads],
})
export class UploadsModule {}

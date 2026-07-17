import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { UploadsController } from './uploads.controller';
import { UsersModule } from '../users/users.module';
import { DbModule } from '../db/db.module';

@Module({
  imports: [DbModule, UsersModule],
  controllers: [MediaController, UploadsController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}

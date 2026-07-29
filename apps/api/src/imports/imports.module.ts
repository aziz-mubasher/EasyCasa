import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { ListingsModule } from '../listings/listings.module';
import { MediaModule } from '../media/media.module';
import { UsersModule } from '../users/users.module';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [DbModule, UsersModule, ListingsModule, MediaModule],
  controllers: [ImportsController],
  providers: [ImportsService],
  exports: [ImportsService],
})
export class ImportsModule {}

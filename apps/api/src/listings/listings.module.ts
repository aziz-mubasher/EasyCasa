import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingsRepository } from './listings.repository';
import { UsersModule } from '../users/users.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [UsersModule, SearchModule],
  controllers: [ListingsController],
  providers: [ListingsService, ListingsRepository],
  exports: [ListingsService],
})
export class ListingsModule {}

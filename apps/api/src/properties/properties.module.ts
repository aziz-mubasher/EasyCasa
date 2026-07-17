import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { UsersModule } from '../users/users.module';
import { ServiceCatalogModule } from '../service-catalog/service-catalog.module';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [DbModule, UsersModule, ServiceCatalogModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}

import { Module } from '@nestjs/common';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { ListingsModule } from './listings/listings.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { UsersModule } from './users/users.module';
import { MediaModule } from './media/media.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    DbModule,
    AuthModule,
    UsersModule,
    ListingsModule,
    TaxonomyModule,
    MediaModule,
    AdminModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

import { Module } from '@nestjs/common';

import { DbModule } from '../db/db.module';
import { SellerQuotaService } from './seller-quota.service';

@Module({
  imports: [DbModule],
  providers: [SellerQuotaService],
  exports: [SellerQuotaService],
})
export class SellerQuotaModule {}

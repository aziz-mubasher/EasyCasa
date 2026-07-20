import { Controller, Get, Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { Roles } from './auth/roles.decorator';
import { ConfigModule } from './config/config.module';
import { SeamsModule } from './config/adapters/seams.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';

/**
 * Consolidation boot module (36.1) — real Config+Seams+Auth+Email with sample
 * routes. APP_GUARD stays on AuthModule (no double registration).
 */
@Controller('me')
class MeController {
  @Get()
  me() {
    return { ok: true };
  }
}

@Controller('admin')
class AdminController {
  @Roles('admin')
  @Get()
  adminOnly() {
    return { ok: true };
  }
}

@Module({
  imports: [ConfigModule, SeamsModule, AuthModule, EmailModule],
  controllers: [HealthController, MeController, AdminController],
})
export class ConsolidationModule {}

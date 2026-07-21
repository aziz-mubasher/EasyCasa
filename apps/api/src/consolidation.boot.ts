import { Controller, Get, Injectable, Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import type { AuthUser } from './auth/auth.types';
import { Roles } from './auth/roles.decorator';
import { ConfigModule } from './config/config.module';
import { SeamsModule } from './config/adapters/seams.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';
import { HealthIndicatorRegistry } from './health/health-indicator.registry';
import { ReadinessController } from './health/readiness.controller';
import { ObservabilityModule } from './observability/observability.module';
import { CONSENT_STORE } from './privacy/consent.service';
import { PrivacyModule } from './privacy/privacy.module';
import { RETENTION_SINK } from './privacy/retention.service';
import { UsersService } from './users/users.service';

/**
 * Full-spine consolidation boot (39.1) — Config/Seams/Auth/Email/Observability/
 * Privacy in ONE graph, with stub readiness + privacy stores (no Docker).
 * If any two phases fight over DI or the request pipeline, this fails.
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

@Controller('boom')
class BoomController {
  @Get()
  boom(): never {
    throw new Error('kaboom-secret');
  }
}

/** Maps DEV_AUTH principal → subject id without hitting Postgres. */
@Injectable()
class StubUsersService {
  async getOrCreate(user: AuthUser): Promise<{ id: string }> {
    return { id: user.sub };
  }
}

@Module({
  providers: [{ provide: UsersService, useClass: StubUsersService }],
  exports: [UsersService],
})
class StubUsersModule {}

const consentStore = {
  rows: [] as unknown[],
  async append(r: unknown) {
    this.rows.push(r);
  },
  async latest() {
    return null;
  },
  async listForSubject() {
    return [];
  },
};

const stubRegistry = new HealthIndicatorRegistry();
stubRegistry.register({
  name: 'postgres',
  async check() {
    return { name: 'postgres', up: true };
  },
});

@Module({
  imports: [
    ConfigModule,
    SeamsModule,
    AuthModule,
    EmailModule,
    ObservabilityModule,
    PrivacyModule.forRoot({
      imports: [StubUsersModule],
      providers: [
        { provide: CONSENT_STORE, useValue: consentStore },
        {
          provide: RETENTION_SINK,
          useValue: { async anonymizeStaleLeadsBefore() { return 0; } },
        },
      ],
    }),
  ],
  controllers: [HealthController, ReadinessController, MeController, AdminController, BoomController],
  providers: [{ provide: HealthIndicatorRegistry, useValue: stubRegistry }],
})
export class ConsolidationModule {}

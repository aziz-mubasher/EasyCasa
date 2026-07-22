import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from './jwt.guard';
import { JwtVerifier } from './jwt-verifier';
import { JWKS_RESOLVER, jwksProvider } from './jwks.provider';
import { RolesGuard } from './roles.guard';

/**
 * Auth module — Phase 35. JWKS resolver + verifier + global guards.
 * APP_GUARD stays here (not AppModule) so composition-root tests stay honest.
 */
@Global()
@Module({
  providers: [
    jwksProvider,
    JwtVerifier,
    JwtAuthGuard,
    RolesGuard,
    // useExisting (not useClass) so integration tests can overrideProvider(JwtAuthGuard).
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
  exports: [JwtAuthGuard, RolesGuard, JwtVerifier, JWKS_RESOLVER],
})
export class AuthModule {}

/**
 * Single indirection point for what the harness boots — Phase 34.
 *
 * Re-exports the real composition root and the real guard the harness overrides.
 */
export { AppModule } from '../../src/app.module';
export { JwtAuthGuard } from '../../src/auth/jwt.guard';

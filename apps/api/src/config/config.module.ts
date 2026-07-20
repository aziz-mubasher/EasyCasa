import { Global, Module } from '@nestjs/common';

import { loadApiConfig, type ApiConfig } from './load';

/**
 * Injection token for the validated, immutable {@link ApiConfig}.
 * Prefer `@InjectConfig()` at call sites.
 */
export const APP_CONFIG = Symbol('APP_CONFIG');

/**
 * Global config module — Phase 33.
 * Surfaces the already-validated env into Nest DI so seams stop reading
 * `process.env` ad hoc. `main.ts` / boot-check still call `loadApiConfig()`
 * first; the factory returns the memoized instance.
 */
@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: (): ApiConfig => loadApiConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}

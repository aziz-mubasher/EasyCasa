import { Global, Module } from '@nestjs/common';
import { db } from './drizzle';

export const DRIZZLE = Symbol('DRIZZLE');

@Global()
@Module({
  // Factory so Phase 34 integration tests can set DATABASE_URL before first connect.
  providers: [{ provide: DRIZZLE, useFactory: () => db }],
  exports: [DRIZZLE],
})
export class DbModule {}

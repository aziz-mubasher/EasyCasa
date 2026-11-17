import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { CallbacksAdminController } from './callbacks.admin.controller';
import { DrizzleCallbacksStore } from './callbacks.drizzle';
import { CallbacksScheduler } from './callbacks.scheduler';
import { CallbacksService } from './callbacks.service';
import { CALLBACKS_STORE } from './callbacks.tokens';
import { CallbacksWebhookController } from './callbacks.webhook.controller';

@Module({
  imports: [UsersModule],
  controllers: [CallbacksWebhookController, CallbacksAdminController],
  providers: [
    CallbacksService,
    CallbacksScheduler,
    DrizzleCallbacksStore,
    { provide: CALLBACKS_STORE, useExisting: DrizzleCallbacksStore },
  ],
})
export class CallbacksModule {}

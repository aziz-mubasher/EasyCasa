import { Inject } from '@nestjs/common';

import { APP_CONFIG } from './config.module';

/**
 * Sugar for `@Inject(APP_CONFIG)`:
 *   constructor(@InjectConfig() private readonly config: ApiConfig) {}
 */
export const InjectConfig = (): ParameterDecorator => Inject(APP_CONFIG);

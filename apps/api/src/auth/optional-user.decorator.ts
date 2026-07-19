import { createParamDecorator, type ExecutionContext } from '@nestjs/common';

import type { AuthUser } from './auth.types';

/**
 * Like `@CurrentUser`, but returns null when there's no authenticated user.
 * For `@Public` routes that personalise when a token happens to be present
 * (e.g. attaching a valuation request to a logged-in owner) without requiring auth.
 */
export const OptionalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return req.user ?? null;
  },
);

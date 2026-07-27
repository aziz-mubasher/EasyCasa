import createMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Skip locale rewrite for API/auth, static assets (*.*), and Next metadata icons.
  matcher: ['/((?!api|auth|_next|_vercel|icon|apple-icon|.*\\..*).*)'],
};

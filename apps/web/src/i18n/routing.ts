import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['it', 'en', 'es'],
  defaultLocale: 'it',
  localePrefix: 'always',
  // Do not send English-browser visitors to /en. easycasaita.com and `/`
  // always land on Italian; /en and /es stay available from the switcher.
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

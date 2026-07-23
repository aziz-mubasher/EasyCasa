/**
 * Next.js startup hook — logs misconfigured public env vars before serving traffic.
 * Does not crash the process; mirrors EmailStartupService fail-loud pattern on the API.
 */
export async function register(): Promise<void> {
  const { warnMapStyleMisconfigurationAtStartup } = await import('./src/lib/map-config');
  warnMapStyleMisconfigurationAtStartup();
}

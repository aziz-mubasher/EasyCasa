/**
 * MapLibre basemap configuration.
 *
 * NEXT_PUBLIC_MAP_STYLE is baked at image build time (see infra/docker-compose.yml).
 * When unset, we fall back to a keyless OpenFreeMap style so local dev still works,
 * but production builds should always pass the build arg — see warnMapStyleMisconfigurationAtStartup().
 */

/** Keyless OpenFreeMap vector style (OSM data). No API key required. */
export const DEFAULT_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const MAP_MISCONFIG_MESSAGE = [
  'MAP STYLE MISCONFIGURED — basemap may render blank.',
  'NEXT_PUBLIC_MAP_STYLE is unset or empty in this build.',
  'The map panel will show controls and listing markers but no tiles until the web image is rebuilt with a style URL.',
  'Set NEXT_PUBLIC_MAP_STYLE in .env and rebuild: docker compose -f infra/docker-compose.yml --env-file .env up -d --build web',
  `(Recommended default: ${DEFAULT_MAP_STYLE_URL})`,
].join(' ');

/** Style URL passed to MapLibre (env override, else keyless default). */
export function getMapStyleUrl(): string {
  const configured = process.env.NEXT_PUBLIC_MAP_STYLE?.trim();
  return configured || DEFAULT_MAP_STYLE_URL;
}

/** True when NEXT_PUBLIC_MAP_STYLE was baked non-empty at build time. */
export function isMapStyleConfiguredAtBuild(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MAP_STYLE?.trim());
}

/** Log a prominent error when the build omitted NEXT_PUBLIC_MAP_STYLE (server startup). */
export function warnMapStyleMisconfigurationAtStartup(): void {
  if (process.env.NODE_ENV !== 'production') return;
  if (isMapStyleConfiguredAtBuild()) return;
  console.error(`[MapConfig] ${MAP_MISCONFIG_MESSAGE}`);
}

/** Client-side guard — mirrors server startup warning for browser DevTools. */
export function logMapStyleMisconfiguration(): void {
  if (isMapStyleConfiguredAtBuild()) return;
  console.error(`[MapConfig] ${MAP_MISCONFIG_MESSAGE}`);
}

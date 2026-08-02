import { Logger } from '@nestjs/common';

const logger = new Logger('CrmHooks');

/**
 * Fire-safe CRM hook invocation — failures are logged, never rethrown.
 * Host enquiry/viewing/B4A flows must not fail because CRM side effects failed.
 */
export async function crmFireSafe(
  label: string,
  invoke: (() => Promise<void>) | undefined,
): Promise<void> {
  if (!invoke) return;
  try {
    await invoke();
  } catch (err) {
    logger.warn(`CRM hook ${label} failed (swallowed): ${(err as Error).message}`);
  }
}

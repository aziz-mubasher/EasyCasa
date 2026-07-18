/**
 * Order → tasks derivation (pure).
 *
 * When an order is confirmed, each item that requires a regulated professional
 * spawns a task (routed through the Phase 11 credential gate). Items requiring
 * NONE never create a task. Credential lookup is injected so this stays testable.
 */
import type { RequiredCredential } from '../../professionals/domain/types';

export type { RequiredCredential };

export interface SpawnedTask {
  itemCode: string;
  requiredCredential: Exclude<RequiredCredential, 'NONE'>;
}

/**
 * Given the order's resolved item codes and a credential policy, return the set
 * of tasks to open. Deduplicated by item code; NONE items are skipped.
 */
export function tasksForOrder(
  itemCodes: readonly string[],
  requiredCredentialFor: (itemCode: string) => RequiredCredential,
): SpawnedTask[] {
  const seen = new Set<string>();
  const tasks: SpawnedTask[] = [];
  for (const itemCode of itemCodes) {
    if (seen.has(itemCode)) continue;
    seen.add(itemCode);
    const required = requiredCredentialFor(itemCode);
    if (required === 'NONE') continue;
    tasks.push({ itemCode, requiredCredential: required });
  }
  return tasks;
}

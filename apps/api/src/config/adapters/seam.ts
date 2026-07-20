/** Shared shape for external-integration ("seam") adapters — Phase 33. */
export interface SeamStatus {
  readonly name: string;
  readonly configured: boolean;
  /** Names of the env vars this seam needs (for ops/health surfacing). */
  readonly requires: readonly string[];
}

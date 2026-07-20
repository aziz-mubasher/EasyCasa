/**
 * A dependency the app checks for readiness — Phase 39. Each backing service
 * (Postgres, Meilisearch, Redis) implements this and registers under the
 * registry; the readiness endpoint aggregates them.
 */
export interface IndicatorResult {
  name: string;
  up: boolean;
  detail?: string;
}

export interface HealthIndicator {
  readonly name: string;
  check(): Promise<IndicatorResult>;
}

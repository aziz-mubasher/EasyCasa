/** Shared domain enums used across web + api. Extend in Phase 1/2. */
export type PropertyCategory =
  | 'residential'
  | 'renovatable'
  | 'nib'
  | 'commercial'
  | 'auction'
  | 'rooms';

export interface HealthStatus {
  status: 'ok';
  service: string;
  time: string;
}

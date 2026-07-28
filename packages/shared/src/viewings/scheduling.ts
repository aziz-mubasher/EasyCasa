export interface SchedulingConfig {
  slotMinutes: number;
  bufferMinutes: number;
  minLeadMinutes: number;
  maxHorizonDays: number;
}

export const DEFAULT_SCHEDULING_CONFIG: SchedulingConfig = {
  slotMinutes: 45,
  bufferMinutes: 15,
  minLeadMinutes: 120,
  maxHorizonDays: 30,
};

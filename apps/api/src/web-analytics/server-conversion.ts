import { isServerConversion } from '@easycasa/shared';

type Sink = (eventName: string) => void;

let sink: Sink | null = null;

export function registerServerConversionSink(next: Sink | null): void {
  sink = next;
}

/** Count a server-side conversion. No visitor data is accepted. */
export function noteServerConversion(eventName: string): void {
  if (!isServerConversion(eventName)) return;
  sink?.(eventName);
}

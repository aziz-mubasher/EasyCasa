import type { ApiConfig } from '../config';
import { EC_CONSULT_PHONE_ID_6605 } from './ec-consult-lines';

export type EcConsultRuntime = {
  lineEnabled: boolean;
  dryRun: boolean;
  inboxSource: 'elevenlabs' | 'webhook';
  canAutoReply: boolean;
  canSend: boolean;
  missingEnv: string[];
};

export function ecConsultRuntime(config: ApiConfig): EcConsultRuntime {
  const lineEnabled = config.EC_CONSULT_LINE_ENABLED;
  const dryRun = config.EC_CONSULT_DRY_RUN;
  const missing: string[] = [];
  if (!config.META_6605_TOKEN.trim()) missing.push('META_6605_TOKEN');
  if (!config.ELEVENLABS_KB_READ_KEY.trim()) missing.push('ELEVENLABS_KB_READ_KEY');
  const canSend = lineEnabled && !dryRun && missing.length === 0;
  const canAutoReply = lineEnabled && (dryRun || canSend);
  return {
    lineEnabled,
    dryRun,
    inboxSource: config.EC_CONSULT_INBOX_SOURCE,
    canAutoReply,
    canSend,
    missingEnv: missing,
  };
}

export function is6605PhoneId(phoneNumberId: string): boolean {
  return phoneNumberId.trim() === EC_CONSULT_PHONE_ID_6605;
}
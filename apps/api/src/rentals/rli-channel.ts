import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { apiConfig } from '../config';
import type { RliChannel } from './domain/ports';
import type { RliPayload } from './domain/types';

/**
 * Entratel/RLI-web telematic seam. When unconfigured, DEV_AUTH yields a stub
 * protocollo so local flows work; production must set RLI_CHANNEL_*.
 */
@Injectable()
export class EntratelRliChannel implements RliChannel {
  async submit(payload: RliPayload): Promise<{ protocollo: string; registeredAt: string }> {
    const endpoint = apiConfig.RLI_CHANNEL_URL;
    const credential = apiConfig.RLI_CHANNEL_CREDENTIAL;

    if (!endpoint || !credential) {
      if (!apiConfig.DEV_AUTH) {
        throw new Error('RLI channel is not configured (RLI_CHANNEL_URL/CREDENTIAL)');
      }
      const digest = createHmac('sha256', 'dev-rli')
        .update(JSON.stringify(payload))
        .digest('hex')
        .slice(0, 12)
        .toUpperCase();
      return {
        protocollo: `DEV-RLI-${digest}`,
        registeredAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${endpoint}/rli/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credential}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`RLI channel error ${res.status}`);
    const data = (await res.json()) as { protocollo: string; registeredAt: string };
    return { protocollo: data.protocollo, registeredAt: data.registeredAt };
  }
}

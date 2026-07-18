import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { apiConfig } from '../config';
import type { Invoice } from './domain/fattura';
import type { SdIChannel } from '../payments/domain/ports';

/**
 * SdI transmission seam. DEV_AUTH stubs a protocollo when SDI_* is unset.
 * Production must serialise FatturaPA 1.2.2 XML, sign, and transmit.
 */
@Injectable()
export class SdIChannelProvider implements SdIChannel {
  async transmit(invoice: Invoice): Promise<{ protocollo: string; transmittedAt: string }> {
    const url = apiConfig.SDI_CHANNEL_URL;
    const key = apiConfig.SDI_CHANNEL_KEY;

    if (!url || !key) {
      if (!apiConfig.DEV_AUTH) {
        throw new Error('SdI channel is not configured (SDI_CHANNEL_URL / SDI_CHANNEL_KEY)');
      }
      const digest = createHmac('sha256', 'dev-sdi')
        .update(JSON.stringify(invoice))
        .digest('hex')
        .slice(0, 12)
        .toUpperCase();
      return {
        protocollo: `DEV-SDI-${digest}`,
        transmittedAt: new Date().toISOString(),
      };
    }

    const res = await fetch(`${url}/transmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(invoice),
    });
    if (!res.ok) throw new Error(`SdI error ${res.status}`);
    return (await res.json()) as { protocollo: string; transmittedAt: string };
  }
}

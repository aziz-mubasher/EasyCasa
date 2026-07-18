import { Injectable } from '@nestjs/common';

import { apiConfig } from '../config';
import type { AmlScreeningProvider } from '../rentals/domain/ports';

/**
 * PEP / sanctions screening. Unconfigured + non-DEV fails safe (errors).
 * DEV_AUTH returns a clean screen so local KYC flows can run.
 */
@Injectable()
export class HttpAmlScreeningProvider implements AmlScreeningProvider {
  async screen(subject: { fullName: string; countryCode: string }): Promise<{
    pep: boolean;
    sanctionsHit: boolean;
  }> {
    const url = apiConfig.AML_SCREENING_URL;
    const key = apiConfig.AML_SCREENING_KEY;

    if (!url || !key) {
      if (!apiConfig.DEV_AUTH) {
        throw new Error('AML screening provider is not configured (AML_SCREENING_URL/KEY)');
      }
      return { pep: false, sanctionsHit: false };
    }

    const res = await fetch(`${url}/screen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(subject),
    });
    if (!res.ok) throw new Error(`AML screening error ${res.status}`);
    const data = (await res.json()) as { pep: boolean; sanctionsHit: boolean };
    return { pep: data.pep, sanctionsHit: data.sanctionsHit };
  }
}

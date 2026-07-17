import { Injectable } from '@nestjs/common';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import type { SignatureProvider } from '../transactions/domain/ports';
import { apiConfig } from '../config';

/**
 * Adapter for a qualified/advanced e-signature provider (FEA) with SPID/CIE
 * identity. Creates the signing envelope and returns the hosted signingUrl —
 * the owner authenticates and signs on the provider; EasyCasa never fabricates
 * a signature.
 *
 * When SIGNATURE_PROVIDER_URL/KEY are unset, returns a deterministic stub so
 * local/dev flows can exercise mandate SEND without a live vendor.
 */
@Injectable()
export class HttpSignatureProvider implements SignatureProvider {
  async createEnvelope(input: {
    mandateId: string;
    signerEmail: string;
    documentUrl: string;
  }): Promise<{ envelopeId: string; signingUrl: string }> {
    const baseUrl = apiConfig.SIGNATURE_PROVIDER_URL;
    const apiKey = apiConfig.SIGNATURE_PROVIDER_KEY;

    if (!baseUrl || !apiKey) {
      const envelopeId = `dev-${input.mandateId}-${randomUUID()}`;
      return {
        envelopeId,
        signingUrl: `https://sign.dev.invalid/envelopes/${encodeURIComponent(envelopeId)}`,
      };
    }

    const res = await fetch(`${baseUrl}/envelopes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        reference: input.mandateId,
        signer: { email: input.signerEmail },
        document: { url: input.documentUrl },
        identity: 'spid-cie',
      }),
    });
    if (!res.ok) throw new Error(`Signature provider error ${res.status}`);

    const data = (await res.json()) as { envelopeId: string; signingUrl: string };
    return { envelopeId: data.envelopeId, signingUrl: data.signingUrl };
  }
}

/** HMAC-SHA256 hex of raw body; compares with `x-signature` header. */
export function verifySignatureWebhook(
  rawBody: Buffer,
  header: string | undefined,
  secret: string,
): boolean {
  if (!secret || !header) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

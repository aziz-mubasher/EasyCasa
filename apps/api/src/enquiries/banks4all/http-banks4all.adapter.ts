import { Inject, Injectable, Logger } from '@nestjs/common';

import type { ApiConfig } from '../../config';
import { APP_CONFIG } from '../../config/config.module';
import type { Banks4AllPort } from './banks4all.port';
import type { Banks4AllAttestation, Banks4AllVerifyOutcome } from './types';

const VERIFY_TIMEOUT_MS = 3_000;

interface RawAttestationBody {
  status?: unknown;
  band_max_cents?: unknown;
  expires_at?: unknown;
  holder_initials?: unknown;
}

function parseAttestation(body: unknown): Banks4AllAttestation | null {
  if (!body || typeof body !== 'object') return null;
  const raw = body as RawAttestationBody;
  if (raw.status !== 'valid') return null;
  const band = Number(raw.band_max_cents);
  if (!Number.isFinite(band) || band <= 0) return null;
  const expiresAt = String(raw.expires_at ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return null;
  const holderInitials = String(raw.holder_initials ?? '').trim();
  if (!holderInitials) return null;
  return {
    status: 'valid',
    bandMaxCents: Math.round(band),
    expiresAt,
    holderInitials,
  };
}

/**
 * HTTP adapter for GET /v1/attestations/:trackingToken (B4A-1).
 * Empty base URL or partner token → unavailable (fail soft).
 */
@Injectable()
export class HttpBanks4AllAdapter implements Banks4AllPort {
  private readonly logger = new Logger(HttpBanks4AllAdapter.name);

  constructor(@Inject(APP_CONFIG) private readonly config: ApiConfig) {}

  async verify(token: string): Promise<Banks4AllVerifyOutcome> {
    const base = this.config.BANKS4ALL_ATTESTATION_BASE_URL.trim().replace(/\/$/, '');
    const partnerToken = this.config.BANKS4ALL_PARTNER_TOKEN.trim();
    if (!base || !partnerToken) {
      return { ok: false, reason: 'unavailable' };
    }

    const url = `${base}/v1/attestations/${encodeURIComponent(token)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${partnerToken}`,
        },
        signal: controller.signal,
      });

      if (res.status === 404 || res.status === 401) {
        return { ok: false, reason: 'not_found' };
      }
      if (res.status >= 500 || res.status === 503) {
        return { ok: false, reason: 'unavailable' };
      }
      if (!res.ok) {
        return { ok: false, reason: 'unavailable' };
      }

      const json: unknown = await res.json().catch(() => null);
      const attestation = parseAttestation(json);
      if (!attestation) {
        return { ok: false, reason: 'unavailable' };
      }
      return { ok: true, attestation };
    } catch (err) {
      this.logger.debug(
        `banks4all verify unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { ok: false, reason: 'unavailable' };
    } finally {
      clearTimeout(timer);
    }
  }
}

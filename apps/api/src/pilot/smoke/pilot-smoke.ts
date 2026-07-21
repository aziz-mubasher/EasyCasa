/**
 * Seeker-path smoke runner — Phase 40. Drives the whole pilot journey against a
 * running instance and returns a pass/fail report. `fetchFn` is injectable for
 * testing; in prod it's global fetch against the staging BASE_URL.
 *
 * - `contract` (default): Phase 37 reference app bodies/paths (no Nest `/api`
 *   prefix — set BASE_URL to the API root, e.g. `https://easycasaita.com/api`).
 * - `live`: real controllers (bounds+zoom, UUID listing id, enquiry intent DTO,
 *   viewing startMs). Pass auth headers + granted Phase 38 consents.
 */
export interface SmokeStep {
  name: string;
  ok: boolean;
  detail?: string;
}
export interface SmokeReport {
  ok: boolean;
  steps: SmokeStep[];
  durationMs: number;
}

export interface SmokeOptions {
  baseUrl: string;
  fetchFn?: typeof fetch;
  /** Extra headers for authed steps (Authorization or x-dev-* under DEV_AUTH). */
  authHeaders?: Record<string, string>;
  seeker?: { name: string; email: string };
  /** `contract` = reference app; `live` = production Nest routes. */
  target?: 'contract' | 'live';
}

export async function runSeekerSmoke(opts: SmokeOptions): Promise<SmokeReport> {
  const fetchFn = opts.fetchFn ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, '');
  const seeker = opts.seeker ?? { name: 'Smoke Tester', email: 'smoke@easycasaita.com' };
  const target = opts.target ?? 'contract';
  const authed = { 'content-type': 'application/json', ...(opts.authHeaders ?? {}) };
  const steps: SmokeStep[] = [];
  const started = Date.now();
  let listingKey = '';

  const run = async (name: string, fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn();
      steps.push({ name, ok: true });
      return true;
    } catch (err) {
      steps.push({
        name,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  };

  const readyOk = await run('readiness', async () => {
    const r = await fetchFn(`${base}/health/ready`);
    if (!r.ok) throw new Error(`/health/ready → ${r.status}`);
  });

  const searchOk =
    readyOk &&
    (await run('search', async () => {
      const body =
        target === 'live'
          ? {
              minLat: 45.4,
              minLng: 9.1,
              maxLat: 45.5,
              maxLng: 9.3,
              zoom: 12,
            }
          : { minLat: 45.4, minLng: 9.1, maxLat: 45.5, maxLng: 9.3 };
      const r = await fetchFn(`${base}/search/bounds`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`/search/bounds → ${r.status}`);
      const b = (await r.json()) as {
        count?: number;
        total?: number;
        results?: { slug: string }[];
        pins?: { listingId: string }[];
      };
      if (target === 'live') {
        if (!b.total || !b.pins?.length) {
          throw new Error('no listings returned — is the seed applied?');
        }
        listingKey = b.pins[0].listingId;
      } else {
        if (!b.count || !b.results?.length) {
          throw new Error('no listings returned — is the seed applied?');
        }
        listingKey = b.results[0].slug;
      }
    }));

  const detailOk =
    searchOk &&
    (await run('listing detail', async () => {
      const r = await fetchFn(`${base}/listings/${listingKey}`);
      if (!r.ok) throw new Error(`/listings/${listingKey} → ${r.status}`);
    }));

  const enquiryOk =
    detailOk &&
    (await run('enquiry', async () => {
      if (target === 'live' && opts.authHeaders) {
        await grantPilotConsents(fetchFn, base, authed);
      }
      const payload =
        target === 'live'
          ? {
              intent: 'info',
              message: 'Smoke test enquiry',
              contactEmail: seeker.email,
            }
          : {
              seekerName: seeker.name,
              seekerEmail: seeker.email,
              message: 'Smoke test enquiry',
            };
      const r = await fetchFn(`${base}/listings/${listingKey}/enquiries`, {
        method: 'POST',
        headers: authed,
        body: JSON.stringify(payload),
      });
      if (r.status >= 400) throw new Error(`enquiry → ${r.status}`);
    }));

  if (enquiryOk) {
    await run('viewing', async () => {
      const payload =
        target === 'live'
          ? { startMs: Date.now() + 7 * 24 * 60 * 60 * 1000 }
          : {
              seekerName: seeker.name,
              seekerEmail: seeker.email,
              slot: '2026-07-25T15:00',
              whenLocal: 'ven 25 lug 2026, 15:00',
            };
      const r = await fetchFn(`${base}/listings/${listingKey}/viewings`, {
        method: 'POST',
        headers: authed,
        body: JSON.stringify(payload),
      });
      if (r.status >= 400) throw new Error(`viewing → ${r.status}`);
    });
  }

  return { ok: steps.every((s) => s.ok), steps, durationMs: Date.now() - started };
}

async function grantPilotConsents(
  fetchFn: typeof fetch,
  base: string,
  headers: Record<string, string>,
): Promise<void> {
  for (const purpose of ['privacy_policy', 'mediation_disclosure'] as const) {
    const r = await fetchFn(`${base}/me/privacy/consents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        purpose,
        granted: true,
        policyVersion: 'v1-draft',
      }),
    });
    if (r.status >= 400) {
      throw new Error(`consent ${purpose} → ${r.status}`);
    }
  }
}

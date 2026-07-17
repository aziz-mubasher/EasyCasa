import { DOCUMENT_TYPES } from './document-types';
import type {
  Blocker,
  DocumentInstance,
  DocumentTypeDef,
  Gate,
  GateResult,
  PropertyContext,
  Requirement,
  FascicoloEvaluation,
} from './types';

function addMonths(iso: string, months: number): number {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

/** Is this instance present, verified, and (if applicable) still valid? */
function statusOf(
  def: DocumentTypeDef,
  instance: DocumentInstance | undefined,
  now: Date,
): 'ok' | 'MISSING' | 'UNVERIFIED' | 'EXPIRED' {
  if (!instance) return 'MISSING';
  if (!instance.verifiedAt) return 'UNVERIFIED';
  if (def.validityMonths !== undefined) {
    if (!instance.issuedAt) return 'EXPIRED';
    if (addMonths(instance.issuedAt, def.validityMonths) < now.getTime()) return 'EXPIRED';
  }
  return 'ok';
}

function blocker(def: DocumentTypeDef, code: 'MISSING' | 'UNVERIFIED' | 'EXPIRED'): Blocker {
  const reasonEn = {
    MISSING: 'is missing',
    UNVERIFIED: 'is not yet verified',
    EXPIRED: 'has expired',
  }[code];
  const reasonIt = {
    MISSING: 'è mancante',
    UNVERIFIED: 'non è ancora verificato',
    EXPIRED: 'è scaduto',
  }[code];
  return {
    document: def.code,
    code,
    messageEn: `${def.labelEn} ${reasonEn}.`,
    messageIt: `${def.labelIt} ${reasonIt}.`,
  };
}

function requirementFor(def: DocumentTypeDef, gate: Gate): Requirement | undefined {
  return def.gates[gate];
}

function applies(def: DocumentTypeDef, ctx: PropertyContext): boolean {
  if (def.onlyWhen === 'inCondominio') return ctx.inCondominio;
  return true;
}

function evaluateGate(gate: Gate, ctx: PropertyContext, now: Date): GateResult {
  const byCode = new Map(ctx.documents.map((d) => [d.code, d]));
  const blockers: Blocker[] = [];
  const warnings: Blocker[] = [];

  for (const def of DOCUMENT_TYPES) {
    const req = requirementFor(def, gate);
    if (!req) continue;
    if (!applies(def, ctx)) continue;

    const status = statusOf(def, byCode.get(def.code), now);
    if (status === 'ok') continue;

    const entry = blocker(def, status);
    if (req === 'required') blockers.push(entry);
    else warnings.push(entry); // conditional / recommended never hard-block
  }

  return { gate, allowed: blockers.length === 0, blockers, warnings };
}

/**
 * Evaluate all three gates for a property. Pure and deterministic — `now` is
 * injected so tests are stable and the caller controls the clock.
 */
export function evaluateFascicolo(
  ctx: PropertyContext,
  now: Date = new Date(),
): FascicoloEvaluation {
  return {
    publish: evaluateGate('PUBLISH', ctx, now),
    close: evaluateGate('CLOSE', ctx, now),
    registerLease: evaluateGate('REGISTER_LEASE', ctx, now),
  };
}

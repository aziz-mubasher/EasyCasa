import type { AsteExtractionV2, AsteSourcedNumber } from './extraction-schema';

export class AsteLotScopeError extends Error {
  readonly code: 'lotto_selection_required' | 'lotto_not_found';
  readonly foundLabels: string[];

  constructor(
    code: 'lotto_selection_required' | 'lotto_not_found',
    foundLabels: string[],
  ) {
    const labels = foundLabels.join(',');
    super(labels ? `${code}:${labels}` : code);
    this.name = 'AsteLotScopeError';
    this.code = code;
    this.foundLabels = foundLabels;
  }
}

export function isLotScopeFailureReason(reason: string | null | undefined): boolean {
  if (!reason) return false;
  return (
    reason === 'lotto_selection_required' ||
    reason === 'lotto_not_found' ||
    reason.startsWith('lotto_selection_required:') ||
    reason.startsWith('lotto_not_found:')
  );
}

function docTypeOfSource(
  ex: AsteExtractionV2,
  source: { file: string } | null | undefined,
): string | null {
  if (!source?.file) return null;
  const meta = ex.meta.documents.find((d) => d.file === source.file);
  return meta?.doc_type ?? null;
}

/**
 * Prefer avviso-sourced prezzo_base over ordinanza when both appear.
 * Mutates extraction; records warning with prior ordinanza value.
 */
export function applyPrezzoBasePrecedence(ex: AsteExtractionV2): AsteExtractionV2 {
  const pb = ex.economics.prezzo_base;
  if (!pb?.source) return ex;

  const warnings = [...(ex.meta.warnings ?? [])];
  // If AI left both in warnings already, leave; guard for dual candidates in meta.
  const dual = (ex.meta as { prezzo_base_candidates?: AsteSourcedNumber[] }).prezzo_base_candidates;
  if (Array.isArray(dual) && dual.length >= 2) {
    const avviso = dual.find((c) => docTypeOfSource(ex, c.source) === 'avviso');
    const ordinanza = dual.find((c) => docTypeOfSource(ex, c.source) === 'ordinanza');
    if (avviso && ordinanza) {
      ex.economics.prezzo_base = avviso;
      warnings.push(
        `prezzo base precedente: €${ordinanza.value} da ordinanza p.${ordinanza.source.page}`,
      );
    }
  } else {
    // Heuristic: if current prezzo_base is from ordinanza and an avviso doc exists,
    // trust AI's avviso preference already; only annotate when source is ordinanza
    // while warnings mention avviso — leave as-is unless AI returned ordinanza source
    // and we have a sibling field (not available). Soft check: if source doc_type is
    // ordinanza, add a mild warning that avviso should be preferred when present.
    const dtype = docTypeOfSource(ex, pb.source);
    if (dtype === 'ordinanza') {
      const hasAvviso = ex.meta.documents.some((d) => d.doc_type === 'avviso');
      if (hasAvviso) {
        warnings.push(
          `prezzo_base sourced from ordinanza while avviso present — verify avviso takes precedence`,
        );
      }
    }
  }

  ex.meta.warnings = warnings;
  return ex;
}

/**
 * Validate lot scoping after AI extract. Throws AsteLotScopeError when needed.
 * Also strips economics bleed markers via meta.lotti_trovati.
 */
export function assertLotScope(
  ex: AsteExtractionV2,
  lottoLabel: string | null | undefined,
): void {
  const found = (ex.meta.lotti_trovati ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);
  const label = (lottoLabel ?? '').trim();

  if (!label) {
    if (found.length > 1) {
      throw new AsteLotScopeError('lotto_selection_required', found);
    }
    return;
  }

  const norm = (s: string) => s.trim().toLowerCase();
  const match = found.some((f) => norm(f) === norm(label));
  // One lot in the file (often "unico") — a nickname / test label is not a miss.
  if (found.length === 1 && !match) {
      const sole = found[0];
      ex.meta.warnings = [
          ...(ex.meta.warnings ?? []),
          `lotto_label "${label}" ignored; using sole lot "${sole}"`,
      ];
      if (ex.procedura && !ex.procedura.lotto) ex.procedura.lotto = sole;
      if (ex.meta.lotto && !ex.meta.lotto.label) {
          ex.meta.lotto = { ...ex.meta.lotto, label: sole };
      }
      return;
  }
  // If AI found multiple labels and ours isn't among them → not found.
  if (found.length > 1 && !match) {
      throw new AsteLotScopeError('lotto_not_found', found);
  }
  // If AI found nothing but label set — allow through (unico / weak OCR); meta warning.
  if (found.length === 0) {
    ex.meta.warnings = [
      ...(ex.meta.warnings ?? []),
      `lotto_label "${label}" set but meta.lotti_trovati empty`,
    ];
  }
}

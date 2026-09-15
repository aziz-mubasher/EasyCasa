/**
 * EasyCasa corporate operating state.
 *
 * `PERIMETER` / `LicenceState` from EC-AYNI-1 is not in this repo yet.
 * Until that registry exists, this constant is the joint switch for
 * catalog SKUs and copy that are unlawful while Ayni is not enrolled
 * as an agente d'affari in mediazione.
 *
 * Do not collapse product-owner and counsel into one boolean.
 */
export const CORPORATE_STATE = 'PONTE' as const;

export type CorporateState = 'PONTE' | 'AGENTE_IMMOBILIARE' | 'OAM';

export function isPonte(state: CorporateState = CORPORATE_STATE): boolean {
  return state === 'PONTE';
}

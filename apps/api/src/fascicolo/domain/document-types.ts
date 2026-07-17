import type { DocumentTypeDef } from './types';

/**
 * The fascicolo checklist, encoded. Requirement levels per gate reflect the
 * Italian rules verified against Agenzia delle Entrate, Camere di Commercio,
 * and current (2026) sale/rental documentation guidance:
 *
 *  - APE is mandatory to PUBLISH (must exist from the listing) and to
 *    REGISTER_LEASE (attached to the contract). Validity 10 years.
 *  - Catastal conformity (planimetria matching state of fact) and urbanistic
 *    conformity (RTI asseverata) are required to CLOSE (rogito), not to list.
 *  - Atto di provenienza and identity are required to CLOSE.
 *  - Agibilità and impianti are recommended/conditional (buyer may accept
 *    their absence formally) — warnings, not hard blockers.
 *  - Condominium docs required to CLOSE only when the property is in condominio.
 */
export const DOCUMENT_TYPES: readonly DocumentTypeDef[] = [
  {
    code: 'APE',
    labelEn: 'Energy Performance Certificate (APE)',
    labelIt: 'Attestato di Prestazione Energetica (APE)',
    professionalDeliverable: true,
    validityMonths: 120,
    gates: { PUBLISH: 'required', REGISTER_LEASE: 'required', CLOSE: 'required' },
  },
  {
    code: 'ATTO_PROVENIENZA',
    labelEn: 'Deed of provenance',
    labelIt: 'Atto di provenienza',
    professionalDeliverable: false,
    gates: { CLOSE: 'required' },
  },
  {
    code: 'VISURA_CATASTALE',
    labelEn: 'Cadastral survey (visura)',
    labelIt: 'Visura catastale',
    professionalDeliverable: false,
    validityMonths: 6,
    gates: { CLOSE: 'required' },
  },
  {
    code: 'PLANIMETRIA_CATASTALE',
    labelEn: 'Cadastral floor plan (conformity)',
    labelIt: 'Planimetria catastale (conformità)',
    professionalDeliverable: false,
    gates: { CLOSE: 'required' },
  },
  {
    code: 'CONFORMITA_URBANISTICA_RTI',
    labelEn: 'Urbanistic conformity (RTI asseverata)',
    labelIt: 'Conformità urbanistica (RTI asseverata)',
    professionalDeliverable: true,
    gates: { CLOSE: 'required' },
  },
  {
    code: 'IDENTITY',
    labelEn: 'Identity & tax code of parties',
    labelIt: 'Documenti d’identità e codice fiscale',
    professionalDeliverable: false,
    gates: { CLOSE: 'required', REGISTER_LEASE: 'required' },
  },
  {
    code: 'DOC_CONDOMINIALE',
    labelEn: 'Condominium documentation',
    labelIt: 'Documentazione condominiale',
    professionalDeliverable: false,
    gates: { CLOSE: 'required' },
    onlyWhen: 'inCondominio',
  },
  {
    code: 'AGIBILITA',
    labelEn: 'Habitability certificate',
    labelIt: 'Certificato di agibilità',
    professionalDeliverable: false,
    gates: { CLOSE: 'recommended' },
  },
  {
    code: 'CONFORMITA_IMPIANTI',
    labelEn: 'Systems conformity certificates',
    labelIt: 'Certificazioni di conformità impianti',
    professionalDeliverable: false,
    gates: { CLOSE: 'recommended' },
  },
] as const;

const BY_CODE = new Map(DOCUMENT_TYPES.map((d) => [d.code, d]));

export function documentType(code: string): DocumentTypeDef | undefined {
  return BY_CODE.get(code as DocumentTypeDef['code']);
}

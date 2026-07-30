/**
 * Legal holds shown on self-serve erasure (*I miei dati*) and the DPO DSAR screen.
 * Keep both surfaces in sync — disagreeing lists are a false statement.
 */
export const ERASURE_LEGAL_HOLDS_IT = [
  'Documenti fiscali relativi a servizi che hai pagato — 10 anni',
  'Registro dei consensi, come prova di averli raccolti correttamente',
  'Dati oggetto di una verifica antiriciclaggio già avviata',
] as const;

export const ERASURE_LEGAL_HOLDS_EN = [
  'Fiscal records for paid services — 10 years',
  'Consent ledger, as proof of lawful collection',
  'Data subject to an already-started AML check',
] as const;

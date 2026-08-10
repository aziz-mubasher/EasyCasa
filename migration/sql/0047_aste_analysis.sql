-- EC-22: Aste analysis foundation — analyses, documents, chunks, glossary.
-- Confirmed free on origin/main immediately before add (highest was 0046_aste_leads.sql).
-- embedding dimension matches listings.embedding / EMBEDDING_DIM = 1536.

CREATE TABLE IF NOT EXISTS aste_analyses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'draft',
  language        text NOT NULL,
  register        text NOT NULL,
  tribunale       text,
  rge             text,
  lotto           text,
  data_asta       date,
  termine_offerte timestamptz,
  address_raw     text,
  comune          text,
  provincia       text,
  extraction      jsonb,
  semaforo        jsonb,
  omi_check       jsonb,
  failure_reason  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aste_analyses_status_chk CHECK (
    status IN ('draft', 'uploaded', 'processing', 'ready', 'failed')
  ),
  CONSTRAINT aste_analyses_language_chk CHECK (language IN ('it', 'en', 'es')),
  CONSTRAINT aste_analyses_register_chk CHECK (register IN ('investor', 'first_buyer'))
);

CREATE INDEX IF NOT EXISTS aste_analyses_user_id_idx ON aste_analyses (user_id);
CREATE INDEX IF NOT EXISTS aste_analyses_created_idx ON aste_analyses (created_at DESC);

CREATE TABLE IF NOT EXISTS aste_documents (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id       uuid NOT NULL REFERENCES aste_analyses(id) ON DELETE CASCADE,
  minio_key         text NOT NULL,
  original_filename text NOT NULL,
  doc_type          text NOT NULL,
  mime              text NOT NULL,
  size_bytes        integer NOT NULL,
  page_count        integer,
  ocr_status        text NOT NULL DEFAULT 'pending',
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aste_documents_doc_type_chk CHECK (
    doc_type IN ('perizia', 'avviso', 'ordinanza', 'planimetria', 'altro')
  ),
  CONSTRAINT aste_documents_ocr_status_chk CHECK (
    ocr_status IN ('pending', 'done', 'failed')
  ),
  CONSTRAINT aste_documents_size_chk CHECK (size_bytes >= 0)
);

CREATE INDEX IF NOT EXISTS aste_documents_analysis_id_idx ON aste_documents (analysis_id);

CREATE TABLE IF NOT EXISTS aste_doc_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES aste_documents(id) ON DELETE CASCADE,
  page         integer NOT NULL,
  chunk_index  integer NOT NULL,
  text         text NOT NULL,
  embedding    vector(1536),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS aste_doc_chunks_document_id_idx ON aste_doc_chunks (document_id);

CREATE TABLE IF NOT EXISTS aste_glossary (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_key         text NOT NULL,
  language         text NOT NULL,
  register         text NOT NULL,
  definition       text NOT NULL,
  counsel_reviewed boolean NOT NULL DEFAULT false,
  CONSTRAINT aste_glossary_language_chk CHECK (language IN ('it', 'en', 'es')),
  CONSTRAINT aste_glossary_register_chk CHECK (register IN ('investor', 'first_buyer')),
  CONSTRAINT aste_glossary_term_uniq UNIQUE (term_key, language, register)
);

COMMENT ON TABLE aste_analyses IS
  'EC-22: user-owned auction analysis workspace. Dark behind ASTE_ANALYSIS_ENABLED.';
COMMENT ON TABLE aste_documents IS
  'EC-22: uploaded auction docs stored under users/{id}/aste/… in MinIO.';
COMMENT ON TABLE aste_doc_chunks IS
  'EC-22: schema only — populated by EC-23 extraction. embedding dim 1536.';
COMMENT ON TABLE aste_glossary IS
  'EC-22: counsel-unreviewed glossary placeholders; not user-visible yet.';

-- Glossary seed: 12 terms × IT/EN × investor/first_buyer. counsel_reviewed=false.
INSERT INTO aste_glossary (term_key, language, register, definition, counsel_reviewed) VALUES
-- perizia_ctu
('perizia_ctu', 'it', 'investor', 'Relazione tecnica del CTU sullo stato e sulla provenienza del bene.', false),
('perizia_ctu', 'it', 'first_buyer', 'La perizia del CTU (Consulente Tecnico d''Ufficio) descrive condizioni, irregolarità e contesto dell''immobile all''asta.', false),
('perizia_ctu', 'en', 'investor', 'Court expert (CTU) technical report on condition and title context.', false),
('perizia_ctu', 'en', 'first_buyer', 'Perizia CTU — the report by the court-appointed technical expert (Consulente Tecnico d''Ufficio) describing the property''s condition and irregularities.', false),
-- avviso_vendita
('avviso_vendita', 'it', 'investor', 'Atto ufficiale che pubblica termini e condizioni della vendita giudiziaria.', false),
('avviso_vendita', 'it', 'first_buyer', 'L''avviso di vendita è il documento pubblico del tribunale con date, prezzo base e regole per offrire.', false),
('avviso_vendita', 'en', 'investor', 'Official sale notice with auction terms and conditions.', false),
('avviso_vendita', 'en', 'first_buyer', 'Avviso di vendita — the court''s public sale notice listing dates, starting price, and bidding rules.', false),
-- rge
('rge', 'it', 'investor', 'Numero di ruolo generale di esecuzione del procedimento.', false),
('rge', 'it', 'first_buyer', 'Il RGE (Ruolo Generale di Esecuzione) identifica in modo univoco la procedura esecutiva in tribunale.', false),
('rge', 'en', 'investor', 'Enforcement docket number (RGE).', false),
('rge', 'en', 'first_buyer', 'RGE (Ruolo Generale di Esecuzione) — the unique court docket number for the enforcement case.', false),
-- prezzo_base
('prezzo_base', 'it', 'investor', 'Prezzo di partenza indicato nell''avviso di vendita.', false),
('prezzo_base', 'it', 'first_buyer', 'Il prezzo base è il valore di partenza dell''asta pubblicato nell''avviso; l''offerta minima può essere diversa.', false),
('prezzo_base', 'en', 'investor', 'Starting price stated in the sale notice.', false),
('prezzo_base', 'en', 'first_buyer', 'Prezzo base — the auction starting price published in the sale notice (minimum bid may differ).', false),
-- offerta_minima
('offerta_minima', 'it', 'investor', 'Importo minimo ammissibile per la prima offerta.', false),
('offerta_minima', 'it', 'first_buyer', 'L''offerta minima è la soglia sotto la quale l''offerta non è valida, spesso inferiore al prezzo base.', false),
('offerta_minima', 'en', 'investor', 'Lowest admissible first bid.', false),
('offerta_minima', 'en', 'first_buyer', 'Offerta minima — the lowest bid the court will accept, often below the starting price (prezzo base).', false),
-- cauzione
('cauzione', 'it', 'investor', 'Deposito di partecipazione, di solito una percentuale del prezzo base.', false),
('cauzione', 'it', 'first_buyer', 'La cauzione è la somma da versare per poter partecipare all''asta; in caso di inadempimento può essere trattenuta.', false),
('cauzione', 'en', 'investor', 'Participation deposit, typically a share of the starting price.', false),
('cauzione', 'en', 'first_buyer', 'Cauzione — the deposit required to bid; it can be forfeited if you win and fail to complete payment.', false),
-- rilancio_minimo
('rilancio_minimo', 'it', 'investor', 'Incremento minimo tra un''offerta e la successiva.', false),
('rilancio_minimo', 'it', 'first_buyer', 'Il rilancio minimo è l''aumento minimo richiesto a ogni nuova offerta durante la gara.', false),
('rilancio_minimo', 'en', 'investor', 'Minimum raise between successive bids.', false),
('rilancio_minimo', 'en', 'first_buyer', 'Rilancio minimo — the smallest amount by which each new bid must exceed the previous one.', false),
-- stato_occupazione
('stato_occupazione', 'it', 'investor', 'Condizione di possesso: libero, debitore o locatario opponibile.', false),
('stato_occupazione', 'it', 'first_buyer', 'Lo stato di occupazione indica se l''immobile è libero o abitato e quanto può richiedere l''ingresso in possesso.', false),
('stato_occupazione', 'en', 'investor', 'Occupancy: vacant, debtor-occupied, or tenant with opposable lease.', false),
('stato_occupazione', 'en', 'first_buyer', 'Stato di occupazione — whether the property is vacant or occupied, which affects time and cost to take possession.', false),
-- difformita
('difformita', 'it', 'investor', 'Disallineamento edilizio o catastale rispetto al titolo/autorizzazioni.', false),
('difformita', 'it', 'first_buyer', 'Le difformità sono irregolarità di costruzione o di catasto; possono richiedere sanatoria e influenzare mutuo e rivendita.', false),
('difformita', 'en', 'investor', 'Building or cadastral irregularity vs permits/title.', false),
('difformita', 'en', 'first_buyer', 'Difformità — a mismatch between the building (or cadastre) and what was authorised; may need regularisation (sanatoria).', false),
-- decreto_trasferimento
('decreto_trasferimento', 'it', 'investor', 'Provvedimento giudiziale che trasferisce la proprietà all''aggiudicatario.', false),
('decreto_trasferimento', 'it', 'first_buyer', 'Il decreto di trasferimento è l''atto del giudice che rende l''aggiudicatario proprietario e di regola cancella ipoteche e pignoramenti.', false),
('decreto_trasferimento', 'en', 'investor', 'Court transfer decree conveying title to the winner.', false),
('decreto_trasferimento', 'en', 'first_buyer', 'Decreto di trasferimento — the judge''s order that transfers ownership and normally clears registered mortgages and seizures.', false),
-- saldo_prezzo
('saldo_prezzo', 'it', 'investor', 'Pagamento del residuo prezzo entro il termine perentorio.', false),
('saldo_prezzo', 'it', 'first_buyer', 'Il saldo prezzo è la somma restante da versare dopo l''aggiudicazione entro la scadenza fissata dal tribunale.', false),
('saldo_prezzo', 'en', 'investor', 'Balance of the price due within the court deadline.', false),
('saldo_prezzo', 'en', 'first_buyer', 'Saldo prezzo — the remaining purchase price payable after winning, within the court''s strict deadline.', false),
-- spese_condominiali_arretrate
('spese_condominiali_arretrate', 'it', 'investor', 'Quote condominiali non pagate che possono gravare sull''aggiudicatario.', false),
('spese_condominiali_arretrate', 'it', 'first_buyer', 'Le spese condominiali arretrate sono debiti verso il condominio; l''acquirente può dover pagare l''anno in corso e il precedente.', false),
('spese_condominiali_arretrate', 'en', 'investor', 'Unpaid condominium fees that may burden the buyer.', false),
('spese_condominiali_arretrate', 'en', 'first_buyer', 'Spese condominiali arretrate — unpaid building/condo fees; the buyer can owe the current and previous year''s charges.', false)
ON CONFLICT (term_key, language, register) DO NOTHING;

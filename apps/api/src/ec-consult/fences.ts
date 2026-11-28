import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadFixtureKb(): string {
  return readFileSync(join(__dirname, 'fixtures/FIXTURE-KB-v1.2-canonical.txt'), 'utf8');
}

const C2_IT = 'Questa linea non si occupa di mutui o finanziamenti.';
const C3_IT =
  "Per la sua sicurezza non leggiamo documenti in chat. I documenti dell'asta si caricano solo sul sito di Easy Legenda, dove il primo fascicolo è gratuito. Le consigliamo di cancellare il documento da questa chat.";

export function documentRefusalText(locale: string): string {
  void locale;
  return C3_IT;
}

export type FenceKind = 'F1' | 'F2' | 'F3' | 'F5' | 'F6' | 'none';

export function detectFence(userText: string): FenceKind {
  const t = userText.toLowerCase();
  if (/\b(mutuo|mutui|prestito|finanziament|mortgage|loan)\b/i.test(t)) return 'F5';
  if (/\b(quanto vale|valutazione gratuita|stima della casa|worth my house)\b/i.test(t)) return 'F1';
  if (/\b(trovat(e|i|emi)|find me).*(acquirente|buyer|casa|home)\b/i.test(t)) return 'F2';
  if (/\b(conviene|vale la pena|good auction|worth bidding)\b.*\basta\b/i.test(t)) return 'F3';
  if (/\basta\b.*\b(conviene|vale)\b/i.test(t)) return 'F3';
  if (/\bagency\b|\bagenzia\b|\bmediazione\b|\bprovvigione\b/i.test(t)) return 'F2';
  return 'none';
}

export function fenceReply(kind: FenceKind, locale: string): string | null {
  void locale;
  const kb = loadFixtureKb();
  if (kind === 'F5') {
    if (!kb.includes(C2_IT)) return C2_IT;
    return C2_IT;
  }
  if (kind === 'F1') {
    return (
      'Non posso dare un valore della casa in chat. Sul sito easycasaita.com trova la valutazione scritta (99 euro).'
    );
  }
  if (kind === 'F2') {
    return (
      'Easy Casa Italia è un portale e servizi a prezzo fisso: non facciamo mediazione e non troviamo acquirenti o venditori per conto vostro.'
    );
  }
  if (kind === 'F3') {
    return (
      'Easy Legenda legge i documenti del fascicolo d’asta che caricate sul sito; non dice se conviene partecipare né quanto offrire.'
    );
  }
  return null;
}

export const MENU_MISS_CALLBACK_IT_EN = `Non abbiamo capito la scelta della lingua.

We could not understand your language choice.

Se preferisce, il team Easy Casa può richiamarla: risponda con 3 · Parla con il nostro team.
If you prefer, the Easy Casa team can call you back: reply with 3 · Talk to our team.`;
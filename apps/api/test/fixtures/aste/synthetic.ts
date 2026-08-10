/** Minimal synthetic PDF bytes for EC-23 fixtures (no real court docs). */

export function syntheticTextPdf(lines: string[]): Buffer {
  const text = lines.join(' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = Buffer.from(`BT /F1 12 Tf 50 750 Td (${text}) Tj ET`, 'latin1');
  const objs: Buffer[] = [
    Buffer.from('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n'),
    Buffer.from('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n'),
    Buffer.from(
      '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n',
    ),
    Buffer.concat([
      Buffer.from(`4 0 obj<< /Length ${stream.length} >>stream\n`),
      stream,
      Buffer.from('\nendstream\nendobj\n'),
    ]),
    Buffer.from('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n'),
  ];
  const out: Buffer[] = [Buffer.from('%PDF-1.4\n')];
  const offsets = [0];
  let len = out[0]!.length;
  for (const o of objs) {
    offsets.push(len);
    out.push(o);
    len += o.length;
  }
  const xrefPos = len;
  const xrefLines = [`xref\n0 ${objs.length + 1}\n`, '0000000000 65535 f \n'];
  for (const off of offsets.slice(1)) {
    xrefLines.push(`${String(off).padStart(10, '0')} 00000 n \n`);
  }
  xrefLines.push(
    `trailer<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`,
  );
  return Buffer.concat([...out, Buffer.from(xrefLines.join(''))]);
}

/** 1x1 PNG */
export const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export const FIXTURE_NATIVE_PERIZIA = syntheticTextPdf([
  'PERIZIA DI STIMA Tribunale di Milano RGE 123/2024 Lotto 1',
  'Valore di stima 250000 euro Prezzo base 200000 Offerta minima 150000',
  'Cauzione 10 percento Rilancio minimo 2000 Superficie commerciale mq 95',
  'Immobile libero da persone Categoria catastale A/2 Comune Milano Provincia MI',
  'Conformita urbanistica dichiarata conforme Conformita catastale conforme',
  'Stato manutentivo buono Impianti ordinari',
]);

export const FIXTURE_NATIVE_AVVISO = syntheticTextPdf([
  'AVVISO DI VENDITA Tribunale di Milano RGE 123/2024',
  'Data asta 2026-09-15 Termine offerte 2026-09-10 Modalita telematica',
  'Prezzo base 200000 Offerta minima 150000',
]);

export const FIXTURE_MISSING_ECONOMICS = syntheticTextPdf([
  'PERIZIA DI STIMA Tribunale di Roma RGE 99/2023 Lotto 2',
  'Descrizione immobile appartamento piano 3 vani 4',
  'Nessun dato economico di stima riportato in questo estratto sintetico',
  'Stato occupazione libero',
]);

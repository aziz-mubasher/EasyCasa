export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-12 prose prose-neutral">
      <p className="eyebrow">Template — da validare con consulenza legale</p>
      <h1 className="font-display text-3xl font-semibold">Informativa privacy</h1>
      <p className="text-sm text-muted">Versione v1-draft · EasyCasa</p>
      <p className="mt-6 leading-relaxed">
        EasyCasa tratta i dati dei cercatori (account, richieste, visite, ricerche
        salvate) per gestire le richieste e le visite, e — ove l&apos;affare
        proceda — per obblighi di mediazione, fatturazione e antiriciclaggio.
        I lead non convertiti sono anonimizzati dopo il periodo di retention
        configurato. Puoi esercitare i diritti di accesso e cancellazione
        dall&apos;area privacy in-app.
      </p>
      <p className="leading-relaxed">
        Testo completo e elenco dei responsabili del trattamento: vedi{' '}
        <code>docs/legal/privacy-policy.md</code> nel repository (bozza per
        il DPO/consulente).
      </p>
    </article>
  );
}

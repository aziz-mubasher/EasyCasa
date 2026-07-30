/** Permanent non-dismissible demo banner (EC-15). */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#1a1a1a',
        color: '#f5f2eb',
        textAlign: 'center',
        padding: '0.55rem 1rem',
        fontSize: '0.875rem',
        letterSpacing: '0.01em',
        borderBottom: '1px solid rgba(245,242,235,0.15)',
      }}
    >
      Ambiente dimostrativo — gli immobili non sono reali.
    </div>
  );
}

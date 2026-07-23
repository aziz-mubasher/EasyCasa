/** Lightweight SSR placeholder — same cadastral frame, no MapLibre bundle until dynamic import loads. */
export function HeroMapPlaceholder() {
  return (
    <div
      className="relative aspect-square rounded-xl2 border border-line bg-[linear-gradient(var(--line)_1px,transparent_1px),linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-[size:32px_32px] overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-paper/40 animate-pulse" />
      <span className="eyebrow absolute bottom-3 left-3 bg-paper/80 px-1.5 py-0.5 rounded">
        foglio · particella
      </span>
    </div>
  );
}

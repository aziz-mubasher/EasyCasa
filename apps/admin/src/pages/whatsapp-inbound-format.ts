export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'closed';
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 16);
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export function formatThreadWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return formatClock(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function threadPhone(opts: {
  waIdE164?: string;
  waId?: string;
  waIdMasked?: string;
}): string {
  if (opts.waIdE164?.trim()) return opts.waIdE164.trim();
  if (opts.waId?.trim()) return `+${opts.waId.trim()}`;
  return opts.waIdMasked?.trim() || '';
}

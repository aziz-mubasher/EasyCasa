/**
 * Deterministic demo stock photos (picsum seed URLs — not scraped listings).
 * Flagged via listing.attributes.demoImage / DemoListingSeed.imageDemoFlag.
 */
export function demoImageUrls(wpKey: string, count = 3): string[] {
  const n = Math.max(1, Math.min(count, 5));
  const urls: string[] = [];
  for (let i = 0; i < n; i++) {
    urls.push(`https://picsum.photos/seed/ec15-${wpKey}-${i}/960/720`);
  }
  return urls;
}

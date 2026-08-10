/**
 * EC-S-T10 — content-addressed media key (global, immutable).
 * Format: media/{sha256[0:2]}/{sha256}.webp
 */
export function buildGlobalContentAddressedMediaKey(sha256Hex: string): string {
  const hex = sha256Hex.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hex)) {
    throw new Error('sha256Hex must be 64 hex chars');
  }
  return `media/${hex.slice(0, 2)}/${hex}.webp`;
}

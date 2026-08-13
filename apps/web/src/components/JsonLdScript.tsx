import { serializeJsonLd } from '@easycasa/shared';

/** Single JSON-LD emission point — always use serializeJsonLd (T33). */
export function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

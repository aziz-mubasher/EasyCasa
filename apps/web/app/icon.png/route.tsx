import { ImageResponse } from 'next/og';

export const runtime = 'edge';

/** Serves `/icon.png` referenced by manifest.ts (public/ did not exist). */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#16233b',
          color: '#f5f4ef',
          fontSize: 280,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        E<span style={{ color: '#1e5ae0' }}>.</span>
      </div>
    ),
    { width: 512, height: 512 },
  );
}

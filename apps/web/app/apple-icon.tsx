import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Apple touch icon — EasyCasa “E.” mark. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#14212E',
          fontSize: 110,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '-0.04em',
          lineHeight: 1,
        }}
      >
        <span style={{ color: '#F3EDE1' }}>E</span>
        <span style={{ color: '#2C6E9B' }}>.</span>
      </div>
    ),
    { ...size },
  );
}

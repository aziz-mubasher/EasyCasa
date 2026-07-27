import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** Browser tab favicon — EasyCasa “E.” mark on surveyor's ink. */
export default function Icon() {
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
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '-0.06em',
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

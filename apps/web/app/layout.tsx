import type { ReactNode } from 'react';

export const metadata = {
  title: 'EasyCasa',
  description: 'Sell, buy, or rent homes in Italy — commission-free.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

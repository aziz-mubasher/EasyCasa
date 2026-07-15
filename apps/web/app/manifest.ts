import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EasyCasa',
    short_name: 'EasyCasa',
    description: 'Commission-free real estate in Italy.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f4ef',
    theme_color: '#16233b',
    icons: [{ src: '/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}

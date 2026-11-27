import type { Metadata } from 'next';
import '../index.css';

export const metadata: Metadata = {
  title: 'InvenTrack — Jihozlar va Ta’mir Boshqaruvi',
  description: 'Korporativ jihozlar, ta’mir jarayonlari va inventarizatsiya boshqaruv tizimi',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Esta Feito', template: '%s | Esta Feito' },
  description: 'Serviços ao seu alcance em Moçambique — Tete e Maputo',
  keywords: ['serviços', 'moçambique', 'tete', 'maputo', 'canalizador', 'electricista', 'limpeza'],
  themeColor: '#f59e0b',
  manifest: '/manifest.json',
  openGraph: {
    siteName: 'Esta Feito',
    locale: 'pt_MZ',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-surface antialiased">
        {children}
      </body>
    </html>
  );
}

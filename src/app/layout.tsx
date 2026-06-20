import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Απογραφή | Λέσχη Αξιωματικών Καλαμάτας',
  description: 'Διαχείριση αποθέματος εστιατορίου.',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="el" style={{ backgroundColor: '#faf8f3' }}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

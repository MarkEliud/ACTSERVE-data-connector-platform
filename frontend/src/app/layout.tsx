import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { ToastProvider } from '@/lib/contexts/ToastContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ACTSERV Data Connector',
  description: 'Enterprise Data Extraction and Management Platform',
  keywords: 'data extraction, ETL, database connector, data management',
  authors: [{ name: 'Actuarial Services (E.A) Ltd' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <div className="d-flex flex-column min-vh-100">
              <Navbar />
              <main className="flex-grow-1 container-fluid py-4">
                {children}
              </main>
              <Footer />
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}


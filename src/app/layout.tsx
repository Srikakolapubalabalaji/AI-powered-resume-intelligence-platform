import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BAGUPADU — Land Your Dream Job Faster',
  description: 'AI-powered resume builder with ATS optimization, smart job matching, and intelligent job scraping. Build. Analyze. Get Picked. Upload. Do. Win.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e1e3f',
                color: '#ffffff',
                border: '1px solid rgba(108,92,231,0.3)',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#6C5CE7', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ff7675', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

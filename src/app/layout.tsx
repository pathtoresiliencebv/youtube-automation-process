import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConvexClientProvider } from '@/components/providers/convex-provider'
import { ErrorBoundary } from '@/components/error-boundary'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Content Catalyst Engine',
  description: 'YouTube automation system voor het genereren en uploaden van inspirerende content',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className={inter.className}>
        <ErrorBoundary>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
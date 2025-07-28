import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../client/src/index.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sukha Senior Resort - Property Management',
  description: 'Comprehensive property management system for Sukha Senior Resort',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
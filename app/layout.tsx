import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { AmbientBackgroundClient } from '@/components/three/AmbientBackgroundClient'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: 'Queens',
  description: 'A colorful queens placement puzzle.'
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AmbientBackgroundClient />
        {children}
      </body>
    </html>
  )
}

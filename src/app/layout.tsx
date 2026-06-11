import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'throwaway notes',
  description: '익명으로 적고, 구겨서 던지는 공간.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full antialiased" style={{ background: '#F7EFE5' }}>
        {children}
      </body>
    </html>
  )
}

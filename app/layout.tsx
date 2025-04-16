import './scss/theme-dark.scss'

import { ClusterModal } from '@components/ClusterModal'
import { ClusterStatusBanner } from '@components/ClusterStatusButton'
import { MessageBanner } from '@components/MessageBanner'
import { Navbar } from '@components/Navbar'
import { SearchBar } from '@components/SearchBar'
import { ClusterProvider } from '@providers/cluster'
import { ScrollAnchorProvider } from '@providers/scroll-anchor'
import type { Viewport } from 'next'
import { Rubik } from 'next/font/google'
import { Metadata } from 'next/types'

const flavor = process.env.NEXT_PUBLIC_FLAVOR

export const metadata: Metadata = {
  description:
    flavor === 'universe'
      ? 'Inspect transactions, accounts, blocks, and more on Universe'
      : 'Inspect transactions, accounts, blocks, and more on Atlasnet',
  manifest: '/manifest.json',
  title:
    flavor === 'universe'
      ? 'Explorer | Universe'
      : 'Explorer | Atlasnet'
}

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  width: 'device-width'
}

const rubikFont = Rubik({
  display: 'swap',
  subsets: ['latin'],
  variable: '--explorer-default-font',
  weight: ['300', '400', '700']
})

export default function RootLayout ({
                                      analytics,
                                      children
                                    }: {
  analytics?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${rubikFont.variable}`}>
    <body>
    <ScrollAnchorProvider>
      <ClusterProvider>
        <ClusterModal/>
        <div className="main-content pb-4">
          <Navbar/>
          <MessageBanner/>
          <ClusterStatusBanner/>
          <SearchBar/>
          {children}
        </div>
      </ClusterProvider>
    </ScrollAnchorProvider>
    {analytics}
    </body>
    </html>
  )
}

import './scss/theme-dark.scss';

import { ClusterModal } from '@components/ClusterModal';
import { ClusterStatusButton } from '@components/ClusterStatusButton';
import { MessageBanner } from '@components/MessageBanner';
import { Navbar } from '@components/Navbar';
import { ClusterProvider } from '@providers/cluster';
import { ScrollAnchorProvider } from '@providers/scroll-anchor';
// Flavor config now resolved dynamically in app/utils/cluster.ts
import type { Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Rubik } from 'next/font/google';
import { Metadata } from 'next/types';

const SearchBar = dynamic(() => import('@components/SearchBar'), {
    ssr: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const flavor = process.env.FLAVOR || process.env.NEXT_PUBLIC_FLAVOR || 'default';
  
  let title, description;
  switch (flavor) {
    case 'atlasnet':
      title = 'Explorer | Atlasnet';
      description = 'Inspect transactions, accounts, blocks, and more on Atlasnet';
      break;
    case 'universe':
      title = 'Explorer | Universe';
      description = 'Inspect transactions, accounts, blocks, and more on Universe';
      break;
    case 'zink':
      title = 'Explorer | Zink';
      description = 'Inspect transactions, accounts, blocks, and more on Zink';
      break;
    case 'default':
    default:
      title = 'Explorer | Solana';
      description = 'Inspect transactions, accounts, blocks, and more on Solana';
      break;
  }
  
  return {
    description,
    manifest: '/manifest.json',
    title,
  };
}

export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  width: 'device-width'
};

const rubikFont = Rubik({
  display: 'swap',
  subsets: ['latin'],
  variable: '--explorer-default-font',
  weight: ['300', '400', '700']
});

export default function RootLayout ({
                                      analytics,
                                      children
                                    }: {
  analytics?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${rubikFont.variable}`}>
    <head>
                <link rel="icon" href="/favicon.png" type="image/png" />
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
            </head>
            <body>
    <ScrollAnchorProvider>
      <ClusterProvider>
        <ClusterModal/>
        <div className="main-content pb-4">
          <Navbar>
          <SearchBar />
                            </Navbar>
                            <MessageBanner/>
          <div className="container my-3 d-lg-none">
          <SearchBar/></div>
                            <div className="container my-3 d-lg-none">
                                <ClusterStatusButton />
                            </div>
          {children}
        </div>
      </ClusterProvider>
    </ScrollAnchorProvider>
    {analytics}
    </body>
    </html>
  );
}

import './scss/theme-dark.scss';

import { ClusterModal } from '@components/ClusterModal';
import { ClusterStatusButton } from '@components/ClusterStatusButton';
import { MessageBanner } from '@components/MessageBanner';
import { Navbar } from '@components/Navbar';
import { ClusterProvider } from '@providers/cluster';
import { ScrollAnchorProvider } from '@providers/scroll-anchor';
import type { Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Rubik } from 'next/font/google';
import { Metadata } from 'next/types';
const SearchBar = dynamic(() => import('@components/SearchBar'), {
    ssr: false,
});
const flavor = process.env.NEXT_PUBLIC_FLAVOR;

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
};

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

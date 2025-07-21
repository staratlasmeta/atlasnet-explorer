import path from 'node:path'

const ADDRESS_ALIASES = ["account", "accounts", "addresses"];
const TX_ALIASES = ["txs", "txn", "txns", "transaction", "transactions"];
const SUPPLY_ALIASES = ['accounts', 'accounts/top'];

import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flavor = process.env.NEXT_PUBLIC_FLAVOR || 'default';

console.log('Building with flavor:', flavor);
console.log('NEXT_PUBLIC_FLAVOR (from env):', process.env.NEXT_PUBLIC_FLAVOR);
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // FIXME: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
    missingSuspenseWithCSRBailout: false,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'raw.githubusercontent.com',
        pathname: '/solana-labs/token-list/main/assets/**',
        port: '',
        protocol: 'https',
      },
    ],
  },
  output: 'standalone',
  async redirects() {
    return [
      // Leave this above `ADDRESS_ALIASES`, since it also provides an alias for `/accounts`.
      ...SUPPLY_ALIASES.map(oldRoot => ({
        destination: '/supply',
        permanent: true,
        source: '/' + oldRoot
      })),
      ...ADDRESS_ALIASES.flatMap(oldRoot => (
        [':address', ':address/:tab'].map(path => ({
          destination: '/' + ['address', path].join('/'),
          permanent: true,
          source: '/' + [oldRoot, path].join('/'),
        }))
      )),
      ...TX_ALIASES.map(oldRoot => ({
        destination: '/' + ['tx', ':signature'].join('/'),
        permanent: true,
        source: '/' + [oldRoot, ':signature'].join('/'),
      }
      )),
      {
        destination: '/address/:address',
        permanent: true,
        source: '/address/:address/history',
      }
    ]
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }

    config.resolve.alias['@utils/cluster'] = path.resolve(
      __dirname,
      `app/flavors/${flavor}/cluster.ts`
    );
    
    config.resolve.alias['@utils/colors'] = path.resolve(
      __dirname,
      `app/flavors/${flavor}/colors.ts`
    );

    return config;
  }

};


export default nextConfig;

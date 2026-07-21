import { explorerAppName, explorerBrandIcons, explorerNetworkDescriptionName } from '@utils/network';
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    const brandIcons = explorerBrandIcons();

    return {
        background_color: '#000000',
        description: `Inspect transactions, accounts, blocks, and more on ${explorerNetworkDescriptionName()}`,
        display: 'standalone',
        icons: [
            {
                sizes: '192x192',
                src: brandIcons.pwa192,
                type: 'image/png',
            },
            {
                sizes: '512x512',
                src: brandIcons.pwa512,
                type: 'image/png',
            },
        ],
        name: explorerAppName(),
        short_name: explorerAppName(),
        start_url: '/',
        theme_color: '#000000',
    };
}

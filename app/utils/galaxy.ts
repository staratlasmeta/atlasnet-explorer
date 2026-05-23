export type GalaxyNftMetadata = {
    mint: string;
    name: string;
    symbol?: string;
    image?: string;
    media?: {
        thumbnailUrl?: string;
    };
};

const DEFAULT_GALAXY_URL = 'https://galaxy.dev.staratlas.cloud';

let cachedGalaxyMetadataPromise: Promise<Map<string, GalaxyNftMetadata>> | undefined;

export async function getGalaxyMintMetadata(): Promise<Map<string, GalaxyNftMetadata>> {
    if (!cachedGalaxyMetadataPromise) {
        cachedGalaxyMetadataPromise = fetchGalaxyMintMetadata();
    }

    return cachedGalaxyMetadataPromise;
}

async function fetchGalaxyMintMetadata(): Promise<Map<string, GalaxyNftMetadata>> {
    const baseUrl = (process.env.NEXT_PUBLIC_GALAXY_URL ?? DEFAULT_GALAXY_URL).replace(/\/+$/, '');

    if (!baseUrl) {
        return new Map();
    }

    try {
        const response = await fetch(`${baseUrl}/nfts`);
        if (!response.ok) {
            console.error(`Failed to fetch Galaxy metadata: ${response.statusText}`);
            return new Map();
        }

        const data = (await response.json()) as unknown;
        if (!Array.isArray(data)) {
            return new Map();
        }

        return new Map(
            data.filter((nft): nft is GalaxyNftMetadata => isGalaxyNftMetadata(nft)).map(nft => [nft.mint, nft])
        );
    } catch (error) {
        console.error('Failed to fetch Galaxy metadata:', error);
        return new Map();
    }
}

function isGalaxyNftMetadata(value: unknown): value is GalaxyNftMetadata {
    return (
        typeof value === 'object' &&
        value !== null &&
        'mint' in value &&
        typeof value.mint === 'string' &&
        'name' in value &&
        typeof value.name === 'string'
    );
}

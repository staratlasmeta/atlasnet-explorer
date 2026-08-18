import { PublicKey } from '@solana/web3.js';
import { Cluster } from '@utils/cluster';

import { parseClusterParam } from './cluster-param';
import { getTokenInfoWithoutOnChainFallback } from './token-info';

export const ADDRESS_METADATA_LOOKUP_TIMEOUT_MS = 2_000;

export type AddressPageMetadataProps = Readonly<{
    params: {
        address: string;
    };
    searchParams: {
        cluster?: string | string[];
        customUrl?: string | string[];
    };
}>;

async function getTokenInfoForAddressTitle(address: PublicKey, cluster: Cluster) {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<undefined>(resolve => {
        timeoutId = setTimeout(() => {
            resolve(undefined);
            controller.abort();
        }, ADDRESS_METADATA_LOOKUP_TIMEOUT_MS);
    });

    try {
        return await Promise.race([
            getTokenInfoWithoutOnChainFallback(address, cluster, controller.signal),
            timeoutResult,
        ]);
    } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
    }
}

export default async function getReadableTitleFromAddress(props: AddressPageMetadataProps): Promise<string> {
    const {
        params: { address },
        searchParams: { cluster: clusterParam },
    } = props;

    const cluster = parseClusterParam(Array.isArray(clusterParam) ? clusterParam[0] : clusterParam);

    try {
        const tokenInfo = await getTokenInfoForAddressTitle(new PublicKey(address), cluster);
        const tokenName = tokenInfo?.name;
        if (tokenName == null) {
            return address;
        }
        const tokenDisplayAddress = address.slice(0, 2) + '\u2026' + address.slice(-2);
        return `Token | ${tokenName} (${tokenDisplayAddress})`;
    } catch {
        return address;
    }
}

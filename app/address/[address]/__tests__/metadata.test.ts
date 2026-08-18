import { afterEach, describe, expect, it, vi } from 'vitest';

import { ADDRESS_METADATA_LOOKUP_TIMEOUT_MS } from '@/app/utils/get-readable-title-from-address';

import { generateMetadata } from '../page';

vi.mock('@components/account/history/TransactionHistoryCard', () => ({
    TransactionHistoryCard: () => null,
}));

const ADDRESS = 'C4hZ7xxRBm9a1trVe7Gi5qdcHkVgJ8HRvMMaX9fhPYnG';

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe('address document metadata', () => {
    it('does not call mainnet token metadata dependencies for Zink', async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        const metadata = await generateMetadata({
            params: { address: ADDRESS },
            searchParams: { cluster: 'zink' },
        });

        expect(metadata.title).toContain(ADDRESS);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('falls back to the address when token metadata exceeds its time budget', async () => {
        vi.useFakeTimers();
        let requestSignal: AbortSignal | undefined;
        const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
            requestSignal = init?.signal ?? undefined;
            return new Promise<Response>(() => undefined);
        });
        vi.stubGlobal('fetch', fetchMock);

        const metadataPromise = generateMetadata({
            params: { address: ADDRESS },
            searchParams: { cluster: 'devnet' },
        });

        await vi.advanceTimersByTimeAsync(ADDRESS_METADATA_LOOKUP_TIMEOUT_MS);

        await expect(metadataPromise).resolves.toEqual(
            expect.objectContaining({ title: expect.stringContaining(ADDRESS) })
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(requestSignal?.aborted).toBe(true);
    });
});

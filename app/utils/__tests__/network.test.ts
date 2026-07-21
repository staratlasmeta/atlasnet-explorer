import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
});

async function brandIconsFor(flavor: string) {
    vi.stubEnv('NEXT_PUBLIC_FLAVOR', flavor);
    vi.resetModules();

    const { explorerBrandIcons } = await import('../network');

    return explorerBrandIcons();
}

describe('explorerBrandIcons', () => {
    it('uses Zink icons for the Zink flavor', async () => {
        await expect(brandIconsFor('zink')).resolves.toEqual({
            appleTouch: '/brand-icons/zink/apple-touch-icon.png',
            favicon: '/brand-icons/zink/icon-96.png',
            pwa192: '/brand-icons/zink/icon-192.png',
            pwa512: '/brand-icons/zink/icon-512.png',
        });
    });

    it.each(['atlasnet', 'universe', 'universe-local', 'localnet', ''])(
        'uses Star Atlas icons for %s',
        async flavor => {
            await expect(brandIconsFor(flavor)).resolves.toEqual({
                appleTouch: '/brand-icons/star-atlas/apple-touch-icon.png',
                favicon: '/brand-icons/star-atlas/icon-96.png',
                pwa192: '/brand-icons/star-atlas/icon-192.png',
                pwa512: '/brand-icons/star-atlas/icon-512.png',
            });
        }
    );
});

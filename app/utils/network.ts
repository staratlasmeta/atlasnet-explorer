const flavor = process.env.NEXT_PUBLIC_FLAVOR;

const brandIconDirectory = flavor === 'zink' ? 'zink' : 'star-atlas';

export function explorerBrandIcons() {
    const basePath = `/brand-icons/${brandIconDirectory}`;

    return {
        appleTouch: `${basePath}/apple-touch-icon.png`,
        favicon: `${basePath}/icon-96.png`,
        pwa192: `${basePath}/icon-192.png`,
        pwa512: `${basePath}/icon-512.png`,
    };
}

export function explorerNetworkName() {
    switch (flavor) {
        case 'universe':
        case 'universe-local':
            return 'Universe';
        case 'zink':
            return 'Zink Testnet';
        case 'localnet':
            return 'Localnet';
        default:
            return 'Atlasnet';
    }
}

export function explorerNetworkDescriptionName() {
    return flavor === 'zink' ? 'the Zink Testnet' : explorerNetworkName();
}

export function explorerAppName() {
    return `${explorerNetworkName()} Explorer`;
}

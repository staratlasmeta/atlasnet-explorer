const flavor = process.env.NEXT_PUBLIC_FLAVOR;

export function explorerNetworkName() {
    switch (flavor) {
        case 'universe':
        case 'universe-local':
            return 'Universe';
        case 'zink':
            return 'Zink Network';
        case 'localnet':
            return 'Localnet';
        default:
            return 'Atlasnet';
    }
}

export function explorerNetworkDescriptionName() {
    return flavor === 'zink' ? 'the Zink Network' : explorerNetworkName();
}

export function explorerAppName() {
    return `${explorerNetworkName()} Explorer`;
}

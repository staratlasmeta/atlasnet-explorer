const flavor = process.env.NEXT_PUBLIC_FLAVOR;

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

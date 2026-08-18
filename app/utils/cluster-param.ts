import { Cluster, DEFAULT_CLUSTER } from '@utils/cluster';

export function parseClusterParam(clusterParam: string | null | undefined): Cluster {
    switch (clusterParam) {
        case 'atlasnet':
            return Cluster.Atlasnet;
        case 'universe':
            return Cluster.Universe;
        case 'zink':
            return Cluster.Zink;
        case 'universe-local':
            return Cluster.UniverseLocal;
        case 'localnet':
            return Cluster.Localnet;
        case 'custom':
            return Cluster.Custom;
        case 'devnet':
            return Cluster.Devnet;
        case 'testnet':
            return Cluster.Testnet;
        case 'mainnet-beta':
        default:
            return DEFAULT_CLUSTER;
    }
}

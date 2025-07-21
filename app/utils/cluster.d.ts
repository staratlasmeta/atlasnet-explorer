// TypeScript declaration for webpack aliased cluster module
// The actual implementation is resolved via webpack alias in next.config.mjs

export enum ClusterStatus {
  Connected,
  Connecting,
  Failure,
}

export enum Cluster {
  Atlasnet,
  MainnetBeta,
  Testnet,
  Devnet,
  Custom,
  Universe,
  Zink,
  UniverseLocal,
  Localnet,
}

export declare const CLUSTERS: Cluster[];
export declare function clusterSlug(cluster: Cluster): string;
export declare function clusterName(cluster: Cluster): string;
export declare const MAINNET_BETA_URL: string;
export declare const TESTNET_URL: string;
export declare const DEVNET_URL: string;
export declare const ATLASNET_URL: string;
export declare const UNIVERSE_URL: string;
export declare const ZINK_URL: string;
export declare const UNIVERSE_LOCAL_URL: string;
export declare const LOCALNET_URL: string;
export declare function clusterUrl(cluster: Cluster, customUrl: string): string;
export declare const DEFAULT_CLUSTER: Cluster; 
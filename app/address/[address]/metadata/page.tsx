import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

import MetaplexNFTMetadataPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Metadata for the Metaplex NFT with address ${
            props.params.address
        } on ${explorerNetworkDescriptionName()}`,
        title: `Metaplex NFT Metadata | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

export default function MetaplexNFTMetadataPage(props: Props) {
    return <MetaplexNFTMetadataPageClient {...props} />;
}

import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

import NFTAttributesPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Attributes of the Metaplex NFT with address ${
            props.params.address
        } on ${explorerNetworkDescriptionName()}`,
        title: `Metaplex NFT Attributes | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

export default function MetaplexNFTAttributesPage(props: Props) {
    return <NFTAttributesPageClient {...props} />;
}

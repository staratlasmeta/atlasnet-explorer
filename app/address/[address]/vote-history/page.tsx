import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

import VoteHistoryPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Vote history of the address ${
            props.params.address
        } by slot on ${explorerNetworkDescriptionName()}`,
        title: `Vote History | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

export default function VoteHistoryPage(props: Props) {
    return <VoteHistoryPageClient {...props} />;
}

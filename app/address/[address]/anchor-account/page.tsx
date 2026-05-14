import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

import AnchorAccountPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Contents of the Anchor Account at address ${
            props.params.address
        } on ${explorerNetworkDescriptionName()}`,
        title: `Anchor Account Data | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

export default function AnchorAccountPage(props: Props) {
    return <AnchorAccountPageClient {...props} />;
}

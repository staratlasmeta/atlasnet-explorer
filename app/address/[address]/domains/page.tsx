import { DomainsCard } from '@components/account/DomainsCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Domain names owned by the address ${props.params.address} on ${explorerNetworkDescriptionName()}`,
        title: `Domains | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

export default function OwnedDomainsPage({ params: { address } }: Props) {
    return <DomainsCard address={address} />;
}

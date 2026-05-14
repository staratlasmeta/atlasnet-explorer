import { TransactionHistoryCard } from '@components/account/history/TransactionHistoryCard';
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
        description: `History of all transactions involving the address ${
            props.params.address
        } on ${explorerNetworkDescriptionName()}`,
        title: `Transaction History | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

export default function TransactionHistoryPage({ params: { address } }: Props) {
    return <TransactionHistoryCard address={address} />;
}

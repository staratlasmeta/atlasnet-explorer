import { TransactionInspectorPage } from '@components/inspector/InspectorPage';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

type Props = Readonly<{
    params: Readonly<{
        signature: string;
    }>;
}>;

export async function generateMetadata({ params: { signature } }: Props): Promise<Metadata> {
    return {
        description: `Interactively inspect the transaction with signature ${signature} on ${explorerNetworkDescriptionName()}`,
        title: `Transaction Inspector | ${signature} | ${explorerNetworkName()}`,
    };
}

export default function TransactionInspectionPage({ params: { signature } }: Props) {
    return <TransactionInspectorPage signature={signature} showTokenBalanceChanges={false} />;
}

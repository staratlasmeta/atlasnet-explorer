import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';
import React from 'react';

type Props = Readonly<{
    children: React.ReactNode;
    params: Readonly<{
        signature: string;
    }>;
}>;

export async function generateMetadata({ params: { signature } }: Props): Promise<Metadata> {
    if (signature) {
        return {
            description: `Interactively inspect the transaction with signature ${signature} on ${explorerNetworkDescriptionName()}`,
            title: `Transaction Inspector | ${signature} | ${explorerNetworkName()}`,
        };
    } else {
        return {
            description: `Interactively inspect transactions on ${explorerNetworkDescriptionName()}`,
            title: `Transaction Inspector | ${explorerNetworkName()}`,
        };
    }
}

export default function TransactionInspectorLayout({ children }: Props) {
    return children;
}

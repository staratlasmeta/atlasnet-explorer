import { SignatureProps } from '@utils/index';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';
import React from 'react';

import TransactionDetailsPageClient from './page-client';

type Props = Readonly<{
    params: SignatureProps;
}>;

export async function generateMetadata({ params: { signature } }: Props): Promise<Metadata> {
    return {
        description: `Details of the transaction with signature ${signature} on ${explorerNetworkDescriptionName()}`,
        title: `Transaction | ${signature} | ${explorerNetworkName()}`,
    };
}

export default function TransactionDetailsPage(props: Props) {
    return <TransactionDetailsPageClient {...props} />;
}

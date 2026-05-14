import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';
import { Metadata } from 'next/types';

import ProgramMultisigPageClient from './page-client';

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    return {
        description: `Multisig information for the upgrade authority of the program with address ${
            props.params.address
        } on ${explorerNetworkDescriptionName()}`,
        title: `Upgrade Authority Multisig | ${await getReadableTitleFromAddress(props)} | ${explorerNetworkName()}`,
    };
}

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export default function ProgramMultisigPage(props: Props) {
    return <ProgramMultisigPageClient {...props} />;
}

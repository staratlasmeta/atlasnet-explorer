import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';

import SlotHashesPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export const metadata = {
    description: `Hashes of each slot on ${explorerNetworkDescriptionName()}`,
    title: `Slot Hashes | ${explorerNetworkName()}`,
};

export default function SlotHashesPage(props: Props) {
    return <SlotHashesPageClient {...props} />;
}

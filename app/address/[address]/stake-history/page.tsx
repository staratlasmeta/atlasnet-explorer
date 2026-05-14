import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';

import StakeHistoryPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export const metadata = {
    description: `Stake history for each epoch on ${explorerNetworkDescriptionName()}`,
    title: `Stake History | ${explorerNetworkName()}`,
};

export default function StakeHistoryPage(props: Props) {
    return <StakeHistoryPageClient {...props} />;
}

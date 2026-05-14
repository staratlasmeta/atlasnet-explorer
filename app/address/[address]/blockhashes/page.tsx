import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';

import RecentBlockhashesPageClient from './page-client';

type Props = Readonly<{
    params: {
        address: string;
    };
}>;

export const metadata = {
    description: `Recent blockhashes on ${explorerNetworkDescriptionName()}`,
    title: `Recent Blockhashes | ${explorerNetworkName()}`,
};

export default function RecentBlockhashesPage(props: Props) {
    return <RecentBlockhashesPageClient {...props} />;
}

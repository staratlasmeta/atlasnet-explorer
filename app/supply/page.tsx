import { explorerNetworkDescriptionName, explorerNetworkName } from '@utils/network';

import SupplyPageClient from './page-client';

export const metadata = {
    description: `Overview of the native token supply on ${explorerNetworkDescriptionName()}`,
    title: `Supply Overview | ${explorerNetworkName()}`,
};

export default function SupplyPage() {
    return <SupplyPageClient />;
}

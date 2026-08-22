'use client';

import { useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import {
    CombatParticipantArt,
    CombatParticipantKind,
    getCombatAccountGameId,
    resolveFleetParticipantArt,
    resolveStarbaseParticipantArt,
} from '@utils/combat-art';
import { decodeStarFrameAccount, StarFrameValue } from '@utils/starframe';
import { useEffect, useMemo } from 'react';

export function useCombatParticipantArt({
    accountKey,
    kind,
    starbaseLevel = null,
}: {
    accountKey: string | undefined;
    kind: CombatParticipantKind;
    starbaseLevel?: number | null;
}): CombatParticipantArt | null {
    const combatant = useStarFrameAccount(accountKey, kind === 'fleet' ? 'fleet' : 'starSystem');
    const gameId = kind === 'fleet' ? getCombatAccountGameId(combatant) : null;
    const game = useStarFrameAccount(gameId ?? undefined, 'game');

    return useMemo(() => {
        if (kind === 'fleet') {
            return resolveFleetParticipantArt(combatant, game);
        }
        return resolveStarbaseParticipantArt(combatant, starbaseLevel);
    }, [combatant, game, kind, starbaseLevel]);
}

function useStarFrameAccount(address: string | undefined, accountName: 'fleet' | 'game' | 'starSystem') {
    const fetchAccountInfo = useFetchAccountInfo();
    const accountInfo = useAccountInfo(address);

    useEffect(() => {
        if (!address || accountInfo) {
            return;
        }
        fetchAccountInfo(new PublicKey(address), 'raw');
    }, [accountInfo, address, fetchAccountInfo]);

    return useMemo<StarFrameValue | null>(() => {
        const raw = accountInfo?.data?.data.raw;
        if (!raw || raw.length === 0) {
            return null;
        }
        const decoded = decodeStarFrameAccount('sageStarFrame', accountName, raw);
        return decoded?.status === 'decoded' ? decoded.data : null;
    }, [accountInfo, accountName]);
}

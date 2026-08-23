'use client';

import { useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import {
    CombatParticipantArt,
    CombatParticipantKind,
    decodeCombatPlayerName,
    getCombatAccountGameId,
    getFleetAdditionalShipCount,
    getFleetOwnerProfile,
    getPlayerNameAccountAddress,
    resolveFleetParticipantArt,
    resolveStarbaseParticipantArt,
} from '@utils/combat-art';
import { decodeStarFrameAccount, StarFrameValue } from '@utils/starframe';
import { useEffect, useMemo } from 'react';

type Side = 'left' | 'right';

export interface CombatParticipantEnrichment {
    readonly additionalShipCount: bigint | null;
    readonly art: CombatParticipantArt | null;
    readonly ownerProfile: string | null;
    readonly profileName: string | null;
}

export type CombatParticipantEnrichmentBySide = Readonly<Record<Side, CombatParticipantEnrichment>>;

interface CombatParticipantRequest {
    readonly accountKey: string | undefined;
    readonly kind: CombatParticipantKind;
    readonly representativeShipConfigId?: number | null;
    readonly starbaseFactionId?: number | null;
    readonly starbaseLevel?: number | null;
}

/**
 * Enrich both contacts together so either live fleet can supply the shared Game account. This lets
 * telemetry-v3's immutable ship-config id still resolve the defender art when its historical fleet
 * account is unavailable or has since changed composition.
 */
export function useCombatParticipantArt({
    left,
    right,
}: {
    left: CombatParticipantRequest;
    right: CombatParticipantRequest;
}): CombatParticipantEnrichmentBySide {
    const leftAccount = useStarFrameAccount(left.accountKey, 'sageStarFrame', accountName(left.kind));
    const rightAccount = useStarFrameAccount(right.accountKey, 'sageStarFrame', accountName(right.kind));
    const gameId = getCombatAccountGameId(leftAccount) ?? getCombatAccountGameId(rightAccount);
    const game = useStarFrameAccount(gameId ?? undefined, 'sageStarFrame', 'game');

    const leftOwnerProfile = left.kind === 'fleet' ? getFleetOwnerProfile(leftAccount) : null;
    const rightOwnerProfile = right.kind === 'fleet' ? getFleetOwnerProfile(rightAccount) : null;
    const leftPlayerName = useStarFrameAccount(
        getPlayerNameAccountAddress(leftOwnerProfile) ?? undefined,
        'playerProfileStarFrame',
        'playerName'
    );
    const rightPlayerName = useStarFrameAccount(
        getPlayerNameAccountAddress(rightOwnerProfile) ?? undefined,
        'playerProfileStarFrame',
        'playerName'
    );

    return useMemo(
        () => ({
            left: enrichParticipant(left, leftAccount, game, leftOwnerProfile, leftPlayerName),
            right: enrichParticipant(right, rightAccount, game, rightOwnerProfile, rightPlayerName),
        }),
        [
            game,
            left,
            leftAccount,
            leftOwnerProfile,
            leftPlayerName,
            right,
            rightAccount,
            rightOwnerProfile,
            rightPlayerName,
        ]
    );
}

function enrichParticipant(
    request: CombatParticipantRequest,
    account: StarFrameValue | null,
    game: StarFrameValue | null,
    ownerProfile: string | null,
    playerName: StarFrameValue | null
): CombatParticipantEnrichment {
    if (request.kind === 'fleet') {
        return {
            additionalShipCount: getFleetAdditionalShipCount(account),
            art: resolveFleetParticipantArt(account, game, request.representativeShipConfigId ?? null),
            ownerProfile,
            profileName: decodeCombatPlayerName(playerName),
        };
    }

    return {
        additionalShipCount: null,
        art: resolveStarbaseParticipantArt(account, request.starbaseLevel ?? null, request.starbaseFactionId ?? null),
        ownerProfile: null,
        profileName: null,
    };
}

function accountName(kind: CombatParticipantKind): 'fleet' | 'starSystem' {
    return kind === 'fleet' ? 'fleet' : 'starSystem';
}

function useStarFrameAccount(
    address: string | undefined,
    programName: 'sageStarFrame' | 'playerProfileStarFrame',
    accountName: 'fleet' | 'game' | 'playerName' | 'starSystem'
) {
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
        const decoded = decodeStarFrameAccount(programName, accountName, raw);
        return decoded?.status === 'decoded' ? decoded.data : null;
    }, [accountInfo, accountName, programName]);
}

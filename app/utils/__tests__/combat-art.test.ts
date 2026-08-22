import { PublicKey } from '@solana/web3.js';
import {
    decodeCombatPlayerName,
    formatCombatFaction,
    getCombatAccountGameId,
    getFleetAdditionalShipCount,
    getFleetOwnerProfile,
    getPlayerNameAccountAddress,
    resolveFleetParticipantArt,
    resolveStarbaseParticipantArt,
} from '@utils/combat-art';
import { StarFrameValue } from '@utils/starframe';

function fixedName(value: string): StarFrameValue {
    return [[...Array.from(value, character => character.charCodeAt(0)), ...Array(64 - value.length).fill(0)]];
}

describe('combat participant art', () => {
    test('matches fc-app by selecting a ship from the fleet largest occupied class', () => {
        const ownerProfile = new PublicKey(Uint8Array.from({ length: 32 }, () => 7)).toBase58();
        const fleet: StarFrameValue = {
            fleetShips: [
                { key: [9], value: 4n },
                { key: [42], value: 1n },
            ],
            gameId: 'game-account',
            ownerProfile,
            shipCounts: {
                capital: 0,
                commander: 0,
                large: 0,
                medium: 4,
                small: 0,
                titan: 1,
                xSmall: 0,
                xxSmall: 0,
            },
        };
        const game: StarFrameValue = {
            shipDefinitions: {
                ships: {
                    unsizedList: [
                        { id: [9], name: fixedName('Pearce C9 Default Config'), sizeClass: { variant: 'medium' } },
                        { id: [42], name: fixedName('Pearce T1 Default Config'), sizeClass: { variant: 'titan' } },
                    ],
                },
            },
        };

        expect(resolveFleetParticipantArt(fleet, game)).toEqual({
            alt: 'Pearce T1, titan class',
            caption: 'TITAN // Pearce T1',
            src: 'https://cdn.staratlas.com/sage/ship-topdown/T1TAN.png',
        });
        expect(getCombatAccountGameId(fleet)).toBe('game-account');
        expect(getFleetAdditionalShipCount(fleet)).toBe(4n);
        expect(getFleetOwnerProfile(fleet)).toBe(ownerProfile);
        expect(getPlayerNameAccountAddress(ownerProfile)).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    });

    test('uses telemetry v3 representative config instead of mutable fleet composition', () => {
        const fleet: StarFrameValue = {
            fleetShips: [
                { key: [9], value: 4n },
                { key: [42], value: 1n },
            ],
            shipCounts: { medium: 4, titan: 1 },
        };
        const game: StarFrameValue = {
            shipDefinitions: {
                ships: {
                    unsizedList: [
                        { id: [9], name: fixedName('Pearce C9 Default Config'), sizeClass: { variant: 'medium' } },
                        { id: [42], name: fixedName('Pearce T1 Default Config'), sizeClass: { variant: 'titan' } },
                    ],
                },
            },
        };

        expect(resolveFleetParticipantArt(fleet, game, 9)).toEqual({
            alt: 'Pearce C9, medium class',
            caption: 'MEDIUM // Pearce C9',
            src: 'https://cdn.staratlas.com/sage/ship-topdown/PC9.png',
        });
        expect(resolveFleetParticipantArt(null, game, 42)?.caption).toBe('TITAN // Pearce T1');
    });

    test('uses the emitted pre-impact tier with fc-app faction starbase art', () => {
        const system: StarFrameValue = {
            starbase: {
                level: { variant: 'level3' },
                owner: { variant: 'oni' },
            },
        };

        expect(resolveStarbaseParticipantArt(system, 5)).toEqual({
            alt: 'oni t5 starbase',
            caption: 'T5 // ONI',
            src: '/combat/starbases/starbase-tier-5-oni.png',
        });
    });

    test('falls back to fc-app neutral starbase art when faction state is unavailable', () => {
        expect(resolveStarbaseParticipantArt(null, 2)).toEqual({
            alt: 'unresolved t2 starbase',
            caption: 'T2 // UNRESOLVED',
            src: '/combat/starbases/starbase-placeholder-na.png',
        });

        expect(resolveStarbaseParticipantArt(null, 2, 2)).toEqual({
            alt: 'oni t2 starbase',
            caption: 'T2 // ONI',
            src: '/combat/starbases/starbase-tier-2-oni.png',
        });
    });

    test('decodes profile usernames and labels effective v3 factions', () => {
        expect(
            decodeCombatPlayerName({
                name: Array.from(new TextEncoder().encode('bravetarget')),
            })
        ).toBe('bravetarget');
        expect(formatCombatFaction(0)).toBe('UNALIGNED');
        expect(formatCombatFaction(1)).toBe('MUD');
        expect(formatCombatFaction(2)).toBe('ONI');
        expect(formatCombatFaction(3)).toBe('USTUR');
        expect(formatCombatFaction(17)).toBe('FACTION 17');
    });
});

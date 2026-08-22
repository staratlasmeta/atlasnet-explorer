import { getCombatAccountGameId, resolveFleetParticipantArt, resolveStarbaseParticipantArt } from '@utils/combat-art';
import { StarFrameValue } from '@utils/starframe';

function fixedName(value: string): StarFrameValue {
    return [[...Array.from(value, character => character.charCodeAt(0)), ...Array(64 - value.length).fill(0)]];
}

describe('combat participant art', () => {
    test('matches fc-app by selecting a ship from the fleet largest occupied class', () => {
        const fleet: StarFrameValue = {
            fleetShips: [
                { key: [9], value: 4n },
                { key: [42], value: 1n },
            ],
            gameId: 'game-account',
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
    });
});

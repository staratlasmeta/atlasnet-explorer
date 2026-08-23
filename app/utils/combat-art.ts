import { PublicKey } from '@solana/web3.js';

import { StarFrameValue } from './starframe';

export type CombatParticipantKind = 'fleet' | 'starbase';

export interface CombatParticipantArt {
    readonly alt: string;
    readonly caption: string;
    readonly src: string;
}

const SHIP_TOP_DOWN_CDN = 'https://cdn.staratlas.com/sage/ship-topdown';
const PLAYER_PROFILE_PROGRAM_ID = new PublicKey('C4PRoFNroxxzdgeCoM31LJjYRg7kT6ymogSTAT99iD1u');
const PLAYER_NAME_SEED = new TextEncoder().encode('player_name');

// Keep this filename map aligned with fc-app/src/utils/shipImages.ts. The explorer deliberately
// consumes the same top-down art source as the fleet map instead of introducing a second sprite set.
const SHIP_IMAGE_ENTRIES = [
    ['Fimbul Airbike', 'FBLAIR.png'],
    ['Fimbul BYOS Butch', 'FBLBBU.png'],
    ['Fimbul BYOS Earp', 'FBLBEA.png'],
    ['Fimbul BYOS Packlite', 'FBLBPL.png'],
    ['Fimbul BYOS Ranger', 'FBLBRA.png'],
    ['Fimbul BYOS Tankship', 'FBLBTA.png'],
    ['Fimbul ECOS Bombarella', 'FBLEBO.png'],
    ['Fimbul ECOS Greenader', 'FBLEGR.png'],
    ['Fimbul ECOS Treearrow', 'FBLETR.png'],
    ['Fimbul ECOS Unibomba', 'FBLEUN.png'],
    ['Fimbul ECOS Superphoenix', 'SUPER.png'],
    ['Fimbul Lowbie', 'FBLLOW.png'],
    ['Fimbul Mamba', 'FBLMAM.png'],
    ['Fimbul Mamba EX', 'FBLMEX.png'],
    ['Fimbul Sledbarge', 'FBLSLE.png'],
    ['Pearce C9', 'PC9.png'],
    ['Pearce C11', 'PC11.png'],
    ['Pearce D9', 'PD9.png'],
    ['Pearce F4', 'PF4.png'],
    ['Pearce R6', 'PR6.png'],
    ['Pearce R8', 'PR8.png'],
    ['Pearce T1', 'T1TAN.png'],
    ['Pearce X4', 'PX4.png'],
    ['Pearce X5', 'PX5.png'],
    ['Pearce X6', 'PX6.png'],
    ['Ogrika Jod Asteris', 'OGKAJA.png'],
    ['Ogrika Mik', 'OGKAMK.png'],
    ['Ogrika Niruch', 'OGKANR.png'],
    ['Ogrika Ruch', 'OGKARU.png'],
    ['Ogrika Sunpaa', 'OGKASP.png'],
    ['Ogrika Thripid', 'OGKATP.png'],
    ['Ogrika Tursic', 'OGKATU.png'],
    ['Calico ATS Enforcer', 'CALATS.png'],
    ['Calico Compakt Hero', 'CALCH.png'],
    ['Calico Evac', 'CALEV.png'],
    ['Calico Guardian', 'CALG.png'],
    ['Calico Maxhog', 'CALMAX.png'],
    ['Calico Medtech', 'CALMED.png'],
    ['Calico Scud', 'CALSCD.png'],
    ['Calico Shipit', 'CALSHIP.png'],
    ['Opal Bitboat', 'OPALBB.png'],
    ['Opal Jet', 'OPALJ.png'],
    ['Opal Jetjet', 'OPALJJ.png'],
    ['Opal Rayfam', 'OPALRF.png'],
    ['VZUS ambwe', 'VZUSAM.png'],
    ['VZUS ballad', 'VZUSBA.png'],
    ['VZUS opod', 'VZUSOP.png'],
    ['VZUS solos', 'VZUSSO.png'],
    ['Rainbow Arc', 'ARC.png'],
    ['Rainbow Chi', 'CHI.png'],
    ['Rainbow Om', 'OM.png'],
    ['Rainbow Phi', 'PHI.png'],
    ['Armstrong IMP', 'IMP1.png'],
    ['Armstrong IMP Tip', 'IMP2.png'],
    ['Armstrong IMP Tap', 'IMP3.png'],
    ['Busan Pulse', 'BSNPUL.png'],
    ['Busan Maiden Heart', 'HEART.png'],
    ['Busan The Last Stand mk. VIII', 'STAND.png'],
    ['Busan Thrill of Life', 'THRILL.png'],
    ['Tufa Feist', 'TUFAFE.png'],
] as const;

const SIZE_CLASSES = [
    { countKey: 'titan', label: 'TITAN', variant: 'titan' },
    { countKey: 'commander', label: 'COMMANDER', variant: 'commander' },
    { countKey: 'capital', label: 'CAPITAL', variant: 'capital' },
    { countKey: 'large', label: 'LARGE', variant: 'large' },
    { countKey: 'medium', label: 'MEDIUM', variant: 'medium' },
    { countKey: 'small', label: 'SMALL', variant: 'small' },
    { countKey: 'xSmall', label: 'X-SMALL', variant: 'xsmall' },
    { countKey: 'xxSmall', label: 'XX-SMALL', variant: 'xxsmall' },
] as const;

type ObjectValue = Record<string, StarFrameValue>;

/** Resolve the same largest-class fleet contact and ship art used by fc-app's FleetManager. */
export function resolveFleetParticipantArt(
    fleetValue: StarFrameValue | null,
    gameValue: StarFrameValue | null,
    representativeShipConfigId: number | null = null
): CombatParticipantArt | null {
    const fleet = asObject(fleetValue);
    const game = asObject(gameValue);
    if (!game) {
        return null;
    }

    const definitions = asArray(pathValue(game, 'shipDefinitions', 'ships', 'unsizedList'))
        .map(asObject)
        .filter((definition): definition is ObjectValue => definition !== null);
    let largestShip =
        representativeShipConfigId === null
            ? null
            : definitions.find(definition => tupleNumber(definition.id) === representativeShipConfigId) ?? null;

    if (!largestShip && fleet) {
        const shipCounts = asObject(fleet.shipCounts);
        const largestClass = SIZE_CLASSES.find(sizeClass => numericValue(shipCounts?.[sizeClass.countKey]) > 0);
        const activeShipIds = new Set(
            asArray(fleet.fleetShips)
                .map(asObject)
                .filter(entry => numericValue(entry?.value) > 0)
                .map(entry => tupleNumber(entry?.key))
                .filter((shipId): shipId is number => shipId !== null)
        );
        if (largestClass) {
            largestShip =
                definitions
                    .filter(definition => {
                        const id = tupleNumber(definition.id);
                        return (
                            id !== null &&
                            activeShipIds.has(id) &&
                            enumVariant(definition.sizeClass) === largestClass.variant
                        );
                    })
                    .sort((left, right) => (tupleNumber(left.id) ?? 0) - (tupleNumber(right.id) ?? 0))[0] ?? null;
        }
    }
    if (!largestShip) {
        return null;
    }
    const selectedShip = largestShip;

    const largestClass = SIZE_CLASSES.find(sizeClass => sizeClass.variant === enumVariant(selectedShip.sizeClass));
    if (!largestClass) {
        return null;
    }

    const configName = decodeFixedName(selectedShip.name);
    const imageEntry = SHIP_IMAGE_ENTRIES.find(([shipName]) => configName.includes(shipName));
    if (!imageEntry) {
        return null;
    }

    const [shipName, filename] = imageEntry;
    return {
        alt: `${shipName}, ${largestClass.label.toLowerCase()} class`,
        caption: `${largestClass.label} // ${shipName}`,
        src: `${SHIP_TOP_DOWN_CDN}/${filename}`,
    };
}

/** Resolve the fc-app faction/tier starbase sprite while retaining the emitted pre-impact tier. */
export function resolveStarbaseParticipantArt(
    starSystemValue: StarFrameValue | null,
    telemetryLevel: number | null,
    telemetryFactionId: number | null = null
): CombatParticipantArt {
    const starSystem = asObject(starSystemValue);
    const starbase = asObject(starSystem?.starbase);
    const faction = majorFactionVariant(telemetryFactionId) ?? enumVariant(starbase?.owner);
    const level = normalizeStarbaseLevel(telemetryLevel) ?? levelFromVariant(enumVariant(starbase?.level));
    const knownFaction = faction === 'mud' || faction === 'oni' || faction === 'ustur';
    const filename =
        knownFaction && level !== null
            ? level === 6
                ? `starbase-css-${faction}.png`
                : `starbase-tier-${level}-${faction}.png`
            : 'starbase-placeholder-na.png';
    const tierLabel = level === 6 ? 'CSS' : level === null ? 'STARBASE' : `T${level}`;
    const factionLabel = knownFaction ? faction.toUpperCase() : 'UNRESOLVED';

    return {
        alt: `${factionLabel.toLowerCase()} ${tierLabel.toLowerCase()} starbase`,
        caption: `${tierLabel} // ${factionLabel}`,
        src: `/combat/starbases/${filename}`,
    };
}

/** Number of fleet ships not represented by the single contact sprite. */
export function getFleetAdditionalShipCount(fleetValue: StarFrameValue | null): bigint | null {
    const fleet = asObject(fleetValue);
    if (!fleet) {
        return null;
    }

    const declaredTotal = bigintValue(asObject(fleet.shipCounts)?.total);
    const total =
        declaredTotal ??
        asArray(fleet.fleetShips)
            .map(asObject)
            .reduce((sum, entry) => sum + (bigintValue(entry?.value) ?? 0n), 0n);
    return total > 0n ? total - 1n : 0n;
}

export function getFleetOwnerProfile(fleetValue: StarFrameValue | null): string | null {
    const ownerProfile = asObject(fleetValue)?.ownerProfile;
    return typeof ownerProfile === 'string' ? ownerProfile : null;
}

export function getPlayerNameAccountAddress(profileId: string | null): string | null {
    if (!profileId) {
        return null;
    }

    try {
        return PublicKey.findProgramAddressSync(
            [PLAYER_NAME_SEED, new PublicKey(profileId).toBytes()],
            PLAYER_PROFILE_PROGRAM_ID
        )[0].toBase58();
    } catch {
        return null;
    }
}

export function decodeCombatPlayerName(playerNameValue: StarFrameValue | null): string | null {
    const name = asArray(asObject(playerNameValue)?.name);
    if (name.length === 0) {
        return null;
    }

    const bytes = name.map(byte => numericValue(byte)).filter(byte => byte >= 0 && byte <= 255);
    const value = new TextDecoder().decode(Uint8Array.from(bytes)).replaceAll('\0', '').trim();
    return value || null;
}

export function formatCombatFaction(factionId: number | null): string | null {
    if (factionId === null) {
        return null;
    }
    if (factionId === 0) {
        return 'UNALIGNED';
    }
    const major = majorFactionVariant(factionId);
    return major ? major.toUpperCase() : `FACTION ${factionId}`;
}

export function getCombatAccountGameId(value: StarFrameValue | null): string | null {
    const gameId = asObject(value)?.gameId;
    return typeof gameId === 'string' ? gameId : null;
}

function asArray(value: StarFrameValue | undefined | null): StarFrameValue[] {
    return Array.isArray(value) ? value : [];
}

function asObject(value: StarFrameValue | undefined | null): ObjectValue | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}

function decodeFixedName(value: StarFrameValue | undefined): string {
    const tuple = asArray(value);
    const bytes = asArray(tuple[0]);
    const terminatorIndex = bytes.findIndex(byte => numericValue(byte) === 0);
    return bytes
        .map(numericValue)
        .slice(0, terminatorIndex < 0 ? bytes.length : terminatorIndex)
        .map(byte => String.fromCharCode(byte))
        .join('');
}

function enumVariant(value: StarFrameValue | undefined | null): string | null {
    const variant = asObject(value)?.variant;
    return typeof variant === 'string' ? variant.toLowerCase() : null;
}

function levelFromVariant(variant: string | null): number | null {
    if (variant === 'css') {
        return 6;
    }
    const match = /^level([0-5])$/.exec(variant ?? '');
    return match ? Number(match[1]) : null;
}

function normalizeStarbaseLevel(level: number | null): number | null {
    return level !== null && Number.isInteger(level) && level >= 0 && level <= 6 ? level : null;
}

function numericValue(value: StarFrameValue | undefined | null): number {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return 0;
}

function bigintValue(value: StarFrameValue | undefined | null): bigint | null {
    if (typeof value === 'bigint') {
        return value;
    }
    if (typeof value === 'number' && Number.isSafeInteger(value)) {
        return BigInt(value);
    }
    return null;
}

function majorFactionVariant(factionId: number | null): 'mud' | 'oni' | 'ustur' | null {
    if (factionId === 1) {
        return 'mud';
    }
    if (factionId === 2) {
        return 'oni';
    }
    if (factionId === 3) {
        return 'ustur';
    }
    return null;
}

function pathValue(value: ObjectValue, ...path: string[]): StarFrameValue | undefined {
    let current: StarFrameValue | undefined = value;
    for (const key of path) {
        current = asObject(current)?.[key];
        if (current === undefined) {
            return undefined;
        }
    }
    return current;
}

function tupleNumber(value: StarFrameValue | undefined): number | null {
    const tuple = asArray(value);
    const item = tuple[0];
    if (typeof item !== 'number' && typeof item !== 'bigint') {
        return null;
    }
    return numericValue(item);
}

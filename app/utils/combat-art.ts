import { StarFrameValue } from './starframe';

export type CombatParticipantKind = 'fleet' | 'starbase';

export interface CombatParticipantArt {
    readonly alt: string;
    readonly caption: string;
    readonly src: string;
}

const SHIP_TOP_DOWN_CDN = 'https://cdn.staratlas.com/sage/ship-topdown';

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
    gameValue: StarFrameValue | null
): CombatParticipantArt | null {
    const fleet = asObject(fleetValue);
    const game = asObject(gameValue);
    const shipCounts = asObject(fleet?.shipCounts);
    const largestClass = SIZE_CLASSES.find(sizeClass => numericValue(shipCounts?.[sizeClass.countKey]) > 0);
    if (!fleet || !game || !largestClass) {
        return null;
    }

    const activeShipIds = new Set(
        asArray(fleet.fleetShips)
            .map(asObject)
            .filter(entry => numericValue(entry?.value) > 0)
            .map(entry => tupleNumber(entry?.key))
            .filter((shipId): shipId is number => shipId !== null)
    );
    const definitions = asArray(pathValue(game, 'shipDefinitions', 'ships', 'unsizedList'))
        .map(asObject)
        .filter((definition): definition is ObjectValue => definition !== null);
    const largestShip = definitions.find(definition => {
        const id = tupleNumber(definition.id);
        return id !== null && activeShipIds.has(id) && enumVariant(definition.sizeClass) === largestClass.variant;
    });
    if (!largestShip) {
        return null;
    }

    const configName = decodeFixedName(largestShip.name);
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
    telemetryLevel: number | null
): CombatParticipantArt {
    const starSystem = asObject(starSystemValue);
    const starbase = asObject(starSystem?.starbase);
    const faction = enumVariant(starbase?.owner);
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

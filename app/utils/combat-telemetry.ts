import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { decodeStarFrameInstruction } from '@utils/starframe';
import { intoTransactionInstruction } from '@utils/tx';

export const COMBAT_TELEMETRY_V1_VERSION = 1;
export const COMBAT_TELEMETRY_VERSION = 2;

export const FLEET_VS_FLEET_TELEMETRY_V1_LENGTH = 290;
export const FLEET_VS_STARBASE_TELEMETRY_V1_LENGTH = 267;
export const FLEET_VS_FLEET_TELEMETRY_LENGTH = 444;
export const FLEET_VS_STARBASE_TELEMETRY_LENGTH = 348;

const FLEET_VS_FLEET_KIND = 1;
const FLEET_VS_STARBASE_KIND = 2;
const PROGRAM_DATA_PREFIX = 'Program data: ';
const Q6_SCALE = 64n;

export const COMBAT_DAMAGE_TYPES = [
    'kinetic',
    'energy',
    'emp',
    'superchill',
    'shockwave',
    'graygoo',
    'heat',
    'bomb',
] as const;

export type CombatDamageType = (typeof COMBAT_DAMAGE_TYPES)[number];
export type CombatDamageByType = Readonly<Record<CombatDamageType, bigint>>;
export type CombatTelemetryVersion = typeof COMBAT_TELEMETRY_V1_VERSION | typeof COMBAT_TELEMETRY_VERSION;
export type CombatInstructionName = 'attackFleet' | 'attackStarbase';
export type CombatKind = 'fleet-vs-fleet' | 'fleet-vs-starbase';

export interface CombatShotSummary {
    /** Null only for legacy v1 payloads, which did not serialize attempted-shot semantics. */
    readonly attempted: boolean | null;
    readonly hitChancePpm: number;
    readonly dodgeChancePpm: number;
    readonly hit: boolean;
    readonly dodged: boolean;
    readonly crit: boolean;
    readonly rawDamage: bigint;
    readonly blockedDamage: bigint;
    readonly effectiveDamage: bigint;
    /** Null only for legacy v1 payloads. */
    readonly effectiveDamageByType: CombatDamageByType | null;
    /** Missile, legacy, diversity, and fractional carry. Null only for legacy v1 payloads. */
    readonly otherEffectiveDamage: bigint | null;
}

export interface CombatantSnapshot {
    readonly key: string;
    readonly maxHp: number;
    readonly storedHp: number;
    readonly storedPendingHp: number;
    readonly storedSp: number;
    readonly projectedHpQ6: bigint;
    readonly projectedPendingHpQ6: bigint;
    readonly projectedSpQ6: bigint;
    readonly postHp: number;
    readonly postPendingHp: number;
    readonly postSp: number;
    readonly finalHp: number;
    readonly finalPendingHp: number;
    readonly finalSp: number;
    readonly hpDamageTaken: number;
    readonly destroyed: boolean;
    /** Null only for v1, where shield loss is reconstructed from projected/post SP. */
    readonly spDamageTaken: number | null;
}

interface CombatTelemetryBase {
    readonly version: CombatTelemetryVersion;
    readonly slot: bigint;
    readonly unixTimestamp: bigint;
}

export interface FleetVsFleetCombatTelemetry extends CombatTelemetryBase {
    readonly kind: 'fleet-vs-fleet';
    readonly attacker: CombatantSnapshot;
    readonly defender: CombatantSnapshot;
    readonly attackerShot: CombatShotSummary;
    readonly defenderShot: CombatShotSummary;
}

export interface FleetVsStarbaseCombatTelemetry extends CombatTelemetryBase {
    readonly kind: 'fleet-vs-starbase';
    readonly fleet: CombatantSnapshot;
    readonly starbase: CombatantSnapshot;
    readonly attackerShot: CombatShotSummary;
    readonly retaliationDamage: bigint;
    readonly starbaseLevelBefore: number;
    readonly starbaseLevelAfter: number;
    readonly incrementSequenceId: boolean;
    readonly starbaseDestroyedOrDowngraded: boolean;
}

export type CombatTelemetry = FleetVsFleetCombatTelemetry | FleetVsStarbaseCombatTelemetry;

export interface CombatVisualization {
    readonly instructionIndex: number;
    readonly instructionName: CombatInstructionName;
    readonly kind: CombatKind;
    readonly programId: string;
    readonly telemetry: CombatTelemetry | null;
}

const SUPPORTED_LENGTHS = new Set([
    FLEET_VS_FLEET_TELEMETRY_V1_LENGTH,
    FLEET_VS_STARBASE_TELEMETRY_V1_LENGTH,
    FLEET_VS_FLEET_TELEMETRY_LENGTH,
    FLEET_VS_STARBASE_TELEMETRY_LENGTH,
]);

class BorshReader {
    private offset = 0;
    private readonly view: DataView;

    constructor(private readonly bytes: Uint8Array) {
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    }

    readU8(): number {
        this.require(1);
        return this.view.getUint8(this.offset++);
    }

    readBool(): boolean {
        const value = this.readU8();
        if (value !== 0 && value !== 1) {
            throw new Error('Invalid Borsh boolean');
        }
        return value === 1;
    }

    readU32(): number {
        this.require(4);
        const value = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return value;
    }

    readU64(): bigint {
        this.require(8);
        const value = this.view.getBigUint64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readI64(): bigint {
        this.require(8);
        const value = this.view.getBigInt64(this.offset, true);
        this.offset += 8;
        return value;
    }

    readPublicKey(): string {
        this.require(32);
        const value = new PublicKey(this.bytes.subarray(this.offset, this.offset + 32)).toBase58();
        this.offset += 32;
        return value;
    }

    assertDone(): void {
        if (this.offset !== this.bytes.length) {
            throw new Error('Trailing combat telemetry bytes');
        }
    }

    private require(length: number): void {
        if (this.offset + length > this.bytes.length) {
            throw new Error('Truncated combat telemetry');
        }
    }
}

/* eslint-disable sort-keys-fix/sort-keys-fix -- object evaluation order is the Borsh wire order */
function readCombatant(reader: BorshReader, version: CombatTelemetryVersion): CombatantSnapshot {
    return {
        key: reader.readPublicKey(),
        maxHp: reader.readU32(),
        storedHp: reader.readU32(),
        storedPendingHp: reader.readU32(),
        storedSp: reader.readU32(),
        projectedHpQ6: reader.readU64(),
        projectedPendingHpQ6: reader.readU64(),
        projectedSpQ6: reader.readU64(),
        postHp: reader.readU32(),
        postPendingHp: reader.readU32(),
        postSp: reader.readU32(),
        finalHp: reader.readU32(),
        finalPendingHp: reader.readU32(),
        finalSp: reader.readU32(),
        hpDamageTaken: reader.readU32(),
        destroyed: reader.readBool(),
        spDamageTaken: version === COMBAT_TELEMETRY_VERSION ? reader.readU32() : null,
    };
}

function readDamageByType(reader: BorshReader): CombatDamageByType {
    return {
        kinetic: reader.readU64(),
        energy: reader.readU64(),
        emp: reader.readU64(),
        superchill: reader.readU64(),
        shockwave: reader.readU64(),
        graygoo: reader.readU64(),
        heat: reader.readU64(),
        bomb: reader.readU64(),
    };
}

function readShot(reader: BorshReader, version: CombatTelemetryVersion): CombatShotSummary {
    const hitChancePpm = reader.readU32();
    const dodgeChancePpm = reader.readU32();
    const attempted = version === COMBAT_TELEMETRY_VERSION ? reader.readBool() : null;
    const hit = reader.readBool();
    const dodged = reader.readBool();
    const crit = reader.readBool();
    const rawDamage = reader.readU64();
    const blockedDamage = reader.readU64();
    const effectiveDamage = reader.readU64();
    const effectiveDamageByType = version === COMBAT_TELEMETRY_VERSION ? readDamageByType(reader) : null;
    const otherEffectiveDamage = version === COMBAT_TELEMETRY_VERSION ? reader.readU64() : null;

    if (effectiveDamageByType && otherEffectiveDamage !== null) {
        const reconciledDamage = COMBAT_DAMAGE_TYPES.reduce(
            (total, damageType) => total + effectiveDamageByType[damageType],
            otherEffectiveDamage
        );
        if (reconciledDamage !== effectiveDamage) {
            throw new Error('Combat telemetry damage-type breakdown does not reconcile');
        }
    }

    return {
        attempted,
        hitChancePpm,
        dodgeChancePpm,
        hit,
        dodged,
        crit,
        rawDamage,
        blockedDamage,
        effectiveDamage,
        effectiveDamageByType,
        otherEffectiveDamage,
    };
}

function expectedLength(kind: number, version: CombatTelemetryVersion): number | null {
    if (kind === FLEET_VS_FLEET_KIND) {
        return version === COMBAT_TELEMETRY_VERSION
            ? FLEET_VS_FLEET_TELEMETRY_LENGTH
            : FLEET_VS_FLEET_TELEMETRY_V1_LENGTH;
    }
    if (kind === FLEET_VS_STARBASE_KIND) {
        return version === COMBAT_TELEMETRY_VERSION
            ? FLEET_VS_STARBASE_TELEMETRY_LENGTH
            : FLEET_VS_STARBASE_TELEMETRY_V1_LENGTH;
    }
    return null;
}

/** Decode the exact v1/v2 Borsh payload emitted by SAGE combat's `sol_log_data` call. */
export function parseCombatTelemetry(bytes: Uint8Array): CombatTelemetry | null {
    if (!SUPPORTED_LENGTHS.has(bytes.length)) {
        return null;
    }

    try {
        const reader = new BorshReader(bytes);
        const numericKind = reader.readU8();
        const numericVersion = reader.readU8();
        if (numericVersion !== COMBAT_TELEMETRY_V1_VERSION && numericVersion !== COMBAT_TELEMETRY_VERSION) {
            return null;
        }

        const version: CombatTelemetryVersion = numericVersion;
        if (bytes.length !== expectedLength(numericKind, version)) {
            return null;
        }

        const slot = reader.readU64();
        const unixTimestamp = reader.readI64();

        if (numericKind === FLEET_VS_FLEET_KIND) {
            const event: FleetVsFleetCombatTelemetry = {
                kind: 'fleet-vs-fleet',
                version,
                slot,
                unixTimestamp,
                attacker: readCombatant(reader, version),
                defender: readCombatant(reader, version),
                attackerShot: readShot(reader, version),
                defenderShot: readShot(reader, version),
            };
            reader.assertDone();
            return event;
        }

        if (numericKind === FLEET_VS_STARBASE_KIND) {
            const event: FleetVsStarbaseCombatTelemetry = {
                kind: 'fleet-vs-starbase',
                version,
                slot,
                unixTimestamp,
                fleet: readCombatant(reader, version),
                starbase: readCombatant(reader, version),
                attackerShot: readShot(reader, version),
                retaliationDamage: reader.readU64(),
                starbaseLevelBefore: reader.readU8(),
                starbaseLevelAfter: reader.readU8(),
                incrementSequenceId: reader.readBool(),
                starbaseDestroyedOrDowngraded: reader.readBool(),
            };
            reader.assertDone();
            return event;
        }
    } catch {
        return null;
    }

    return null;
}
/* eslint-enable sort-keys-fix/sort-keys-fix */

export function getAppliedCombatHpDamage(snapshot: CombatantSnapshot): bigint {
    return BigInt(snapshot.hpDamageTaken);
}

export function getAppliedCombatSpDamage(snapshot: CombatantSnapshot): bigint {
    if (snapshot.spDamageTaken !== null) {
        return BigInt(snapshot.spDamageTaken);
    }

    const projectedSp = snapshot.projectedSpQ6 / Q6_SCALE;
    const postSp = BigInt(snapshot.postSp);
    return projectedSp > postSp ? projectedSp - postSp : 0n;
}

/** Returns a unique dominant typed component, or null for v1, other-dominant, or mixed damage. */
export function getDominantCombatDamageType(shot: CombatShotSummary | null): CombatDamageType | null {
    if (!shot?.effectiveDamageByType || shot.otherEffectiveDamage === null) {
        return null;
    }

    let dominant: CombatDamageType | null = null;
    let dominantDamage = 0n;
    let tied = false;

    for (const damageType of COMBAT_DAMAGE_TYPES) {
        const damage = shot.effectiveDamageByType[damageType];
        if (damage > dominantDamage) {
            dominant = damageType;
            dominantDamage = damage;
            tied = false;
        } else if (damage > 0n && damage === dominantDamage) {
            tied = true;
        }
    }

    if (dominant === null || dominantDamage === 0n || tied || shot.otherEffectiveDamage >= dominantDamage) {
        return null;
    }
    return dominant;
}

function decodeBase64(value: string): Uint8Array | null {
    if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
        return null;
    }

    try {
        const binary = atob(value);
        return Uint8Array.from(binary, char => char.charCodeAt(0));
    } catch {
        return null;
    }
}

/**
 * Extract `sol_log_data` only while the expected SAGE program is the active invocation frame.
 * CPI children may emit their own `Program data:` lines, so the program stack is part of the boundary.
 */
export function extractCombatTelemetryFromLogs(
    logs: readonly string[],
    programId: string,
    transactionSlot: bigint
): CombatTelemetry[] {
    const programStack: string[] = [];
    const events: CombatTelemetry[] = [];

    for (const log of logs) {
        const invoke = /^Program ([1-9A-HJ-NP-Za-km-z]+) invoke \[(\d+)]$/.exec(log);
        if (invoke) {
            const depth = Number(invoke[2]);
            if (Number.isSafeInteger(depth) && depth > 0) {
                programStack.length = depth - 1;
                programStack.push(invoke[1]);
            }
            continue;
        }

        const completed = /^Program ([1-9A-HJ-NP-Za-km-z]+) (?:success|failed:)/.exec(log);
        if (completed) {
            if (programStack.at(-1) === completed[1]) {
                programStack.pop();
            }
            continue;
        }

        if (!log.startsWith(PROGRAM_DATA_PREFIX) || programStack.at(-1) !== programId) {
            continue;
        }

        const encoded = log.slice(PROGRAM_DATA_PREFIX.length).trim();
        if (!encoded || encoded.includes(' ')) {
            continue;
        }

        const bytes = decodeBase64(encoded);
        if (!bytes) {
            continue;
        }

        const telemetry = parseCombatTelemetry(bytes);
        if (telemetry?.slot === transactionSlot) {
            events.push(telemetry);
        }
    }

    return events;
}

function instructionNameToKind(instructionName: string | undefined): CombatKind | null {
    if (instructionName === 'attackFleet') {
        return 'fleet-vs-fleet';
    }
    if (instructionName === 'attackStarbase') {
        return 'fleet-vs-starbase';
    }
    return null;
}

/** Find SAGE attack instructions and pair each with its canonical telemetry event, if one finalized. */
export function getCombatVisualizations(transactionWithMeta: ParsedTransactionWithMeta): CombatVisualization[] {
    const { transaction, meta, slot } = transactionWithMeta;
    const attacks = transaction.message.instructions.flatMap((instruction, instructionIndex) => {
        if ('parsed' in instruction) {
            return [];
        }

        const transactionInstruction = intoTransactionInstruction(transaction, instruction);
        if (!transactionInstruction) {
            return [];
        }

        const decoded = decodeStarFrameInstruction(transactionInstruction);
        const instructionName = decoded?.instruction?.name;
        const kind = instructionNameToKind(instructionName);
        if (!kind || (instructionName !== 'attackFleet' && instructionName !== 'attackStarbase')) {
            return [];
        }
        const combatInstructionName: CombatInstructionName = instructionName;

        return [
            {
                instructionIndex,
                instructionName: combatInstructionName,
                kind,
                programId: transactionInstruction.programId.toBase58(),
            },
        ];
    });

    if (attacks.length === 0) {
        return [];
    }

    const events =
        meta && meta.err === null
            ? Array.from(new Set(attacks.map(attack => attack.programId))).flatMap(programId =>
                  extractCombatTelemetryFromLogs(meta.logMessages ?? [], programId, BigInt(slot))
              )
            : [];
    const usedEvents = new Set<number>();

    return attacks.map(attack => {
        const eventIndex = events.findIndex((event, index) => event.kind === attack.kind && !usedEvents.has(index));
        if (eventIndex >= 0) {
            usedEvents.add(eventIndex);
        }

        return {
            ...attack,
            telemetry: eventIndex >= 0 ? events[eventIndex] : null,
        };
    });
}

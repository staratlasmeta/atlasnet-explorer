import { ParsedTransactionWithMeta, PublicKey } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import {
    extractCombatTelemetryFromLogs,
    FLEET_VS_FLEET_TELEMETRY_LENGTH,
    FLEET_VS_STARBASE_TELEMETRY_V1_LENGTH,
    getAppliedCombatSpDamage,
    getCombatVisualizations,
    getDominantCombatDamageType,
    parseCombatTelemetry,
} from '../combat-telemetry';

const SAGE_PROGRAM_ID = 'C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF';

const FLEET_VS_FLEET_V2_HEX =
    '010240e201000000000000f15365000000000101010101010101010101010101010101010101010101010101010101010101e8030000200300000a0000006400000020cb0000000000009002000000000000002300000000000058020000080000005a00000058020000080000005a000000c800000000320000000202020202020202020202020202020202020202020202020202020202020202e8030000200300000a0000006400000020cb0000000000009002000000000000002300000000000058020000080000005a00000058020000080000005a000000c8000000003200000060ae0a00b0ad010001010000fa000000000000003200000000000000c80000000000000064000000000000003200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000320000000000000060ae0a00b0ad010001000100fa000000000000003200000000000000c800000000000000640000000000000032000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003200000000000000';

const REPORTED_STARBASE_V1_BASE64 =
    'AgE/OskCAAAAAEeNiGoAAAAAxIiJ5AwkUfBv7ghUEFYxW866bgXlbU+4KmfM1WFILr2QwAEAkMABAAAAAAAMUgEAACRwAAAAAAAAAAAAAAAAAAAvYgAAAAAAkMABAAAAAAAMUgEAkMABAAAAAAAMUgEAAAAAAADuKrB6QYpF9YMa9IdVrgHc95WCweHTWQeLB4zpJ5qNQsgCCABcMwUAAAAAAAAAAAAA10wBAAAAAAAAAAAAAAAAgNgBAAAAAAABFAUAAAAAAAAAAAABFAUAAAAAAAAAAABbHwAAAEBCDwAAAAAAAQAAvCYAAAAAAAAAAAAAAAAAALwmAAAAAAAAsDYAAAAAAAAFBQAA';

function fromHex(hex: string): Uint8Array {
    return Uint8Array.from(hex.match(/.{2}/g) ?? [], byte => Number.parseInt(byte, 16));
}

function fromBase64(value: string): Uint8Array {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

function combatTransaction({ failed = false }: { failed?: boolean } = {}): ParsedTransactionWithMeta {
    const payer = new PublicKey('11111111111111111111111111111111');
    return {
        blockTime: 1_787_333_959,
        meta: {
            computeUnitsConsumed: 1,
            err: failed ? ({ InstructionError: [1, 'Custom'] } as never) : null,
            fee: 5_000,
            innerInstructions: [],
            logMessages: [
                `Program ${SAGE_PROGRAM_ID} invoke [1]`,
                `Program data: ${REPORTED_STARBASE_V1_BASE64}`,
                `Program ${SAGE_PROGRAM_ID} success`,
            ],
            postBalances: [0],
            postTokenBalances: [],
            preBalances: [5_000],
            preTokenBalances: [],
            rewards: [],
            status: failed ? ({ Err: { InstructionError: [1, 'Custom'] } } as never) : { Ok: null },
        },
        slot: 46_742_079,
        transaction: {
            message: {
                accountKeys: [{ pubkey: payer, signer: true, source: 'transaction', writable: true }],
                instructions: [
                    {
                        accounts: [],
                        data: 'K1FDJ7',
                        programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
                    },
                    {
                        accounts: [],
                        data: 'MZaLS2LjivmepGP',
                        programId: new PublicKey(SAGE_PROGRAM_ID),
                    },
                ],
                recentBlockhash: '11111111111111111111111111111111',
            },
            signatures: ['1'.repeat(64)],
        },
        version: 'legacy',
    } as unknown as ParsedTransactionWithMeta;
}

describe('combat telemetry decoder', () => {
    it('decodes the canonical Programs v2 fleet fixture and typed damage', () => {
        const bytes = fromHex(FLEET_VS_FLEET_V2_HEX);
        expect(bytes).toHaveLength(FLEET_VS_FLEET_TELEMETRY_LENGTH);

        const telemetry = parseCombatTelemetry(bytes);
        expect(telemetry?.kind).toBe('fleet-vs-fleet');
        if (telemetry?.kind !== 'fleet-vs-fleet') {
            throw new Error('Unexpected combat kind');
        }

        expect(telemetry.version).toBe(2);
        expect(telemetry.slot).toBe(123_456n);
        expect(telemetry.attackerShot).toMatchObject({
            attempted: true,
            crit: false,
            effectiveDamage: 200n,
            hit: true,
        });
        expect(getDominantCombatDamageType(telemetry.attackerShot)).toBe('kinetic');
        expect(getAppliedCombatSpDamage(telemetry.defender)).toBe(50n);
    });

    it('decodes the reported finalized starbase transaction and reconstructs v1 shield loss', () => {
        const bytes = fromBase64(REPORTED_STARBASE_V1_BASE64);
        expect(bytes).toHaveLength(FLEET_VS_STARBASE_TELEMETRY_V1_LENGTH);

        const telemetry = parseCombatTelemetry(bytes);
        expect(telemetry?.kind).toBe('fleet-vs-starbase');
        if (telemetry?.kind !== 'fleet-vs-starbase') {
            throw new Error('Unexpected combat kind');
        }

        expect(telemetry.version).toBe(1);
        expect(telemetry.starbase.hpDamageTaken).toBe(8_027);
        expect(getAppliedCombatSpDamage(telemetry.starbase)).toBe(1_890n);
        expect(telemetry.retaliationDamage).toBe(14_000n);
    });

    it('fails closed on kind, boolean, reconciliation, and length corruption', () => {
        const baseline = fromHex(FLEET_VS_FLEET_V2_HEX);

        const wrongKind = baseline.slice();
        wrongKind[0] = 0xff;
        expect(parseCombatTelemetry(wrongKind)).toBeNull();

        const invalidAttempted = baseline.slice();
        invalidAttempted[236] = 2;
        expect(parseCombatTelemetry(invalidAttempted)).toBeNull();

        const unreconciledDamage = baseline.slice();
        unreconciledDamage[264] += 1;
        expect(parseCombatTelemetry(unreconciledDamage)).toBeNull();

        expect(parseCombatTelemetry(baseline.slice(0, -1))).toBeNull();
    });
});

describe('combat transaction discovery', () => {
    it('accepts telemetry only from the active SAGE frame and matching transaction slot', () => {
        const payload = REPORTED_STARBASE_V1_BASE64;
        const unrelatedProgram = '11111111111111111111111111111111';
        const logs = [
            `Program ${SAGE_PROGRAM_ID} invoke [1]`,
            `Program ${unrelatedProgram} invoke [2]`,
            `Program data: ${payload}`,
            `Program ${unrelatedProgram} success`,
            `Program data: ${payload}`,
            `Program ${SAGE_PROGRAM_ID} success`,
        ];

        expect(extractCombatTelemetryFromLogs(logs, SAGE_PROGRAM_ID, 46_742_079n)).toHaveLength(1);
        expect(extractCombatTelemetryFromLogs(logs, SAGE_PROGRAM_ID, 46_742_080n)).toHaveLength(0);
    });

    it('pairs an attackStarbase instruction with its finalized telemetry', () => {
        const visualizations = getCombatVisualizations(combatTransaction());
        expect(visualizations).toHaveLength(1);
        expect(visualizations[0]).toMatchObject({
            instructionIndex: 1,
            instructionName: 'attackStarbase',
            kind: 'fleet-vs-starbase',
            programId: SAGE_PROGRAM_ID,
        });
        expect(visualizations[0].telemetry?.kind).toBe('fleet-vs-starbase');
    });

    it('still surfaces the widget for a failed attack but never presents rolled-back telemetry', () => {
        const visualizations = getCombatVisualizations(combatTransaction({ failed: true }));
        expect(visualizations).toHaveLength(1);
        expect(visualizations[0].telemetry).toBeNull();
    });
});

import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import {
    CombatantSnapshot,
    CombatShotSummary,
    CombatVisualization,
    FleetVsFleetCombatTelemetry,
    FleetVsStarbaseCombatTelemetry,
} from '@utils/combat-telemetry';
import { describe, expect, it } from 'vitest';

import { CombatVisualizer } from './CombatVisualizer';

function address(seed: number): string {
    return new PublicKey(Uint8Array.from({ length: 32 }, () => seed)).toBase58();
}

function snapshot({
    destroyed = false,
    hpDamage = 0,
    key,
    spDamage = 0,
}: {
    destroyed?: boolean;
    hpDamage?: number;
    key: string;
    spDamage?: number;
}): CombatantSnapshot {
    return {
        destroyed,
        finalHp: destroyed ? 0 : 800,
        finalPendingHp: 0,
        finalSp: 100,
        hpDamageTaken: hpDamage,
        key,
        maxHp: 1_000,
        postHp: destroyed ? 0 : 800,
        postPendingHp: 0,
        postSp: 100,
        projectedHpQ6: 64_000n,
        projectedPendingHpQ6: 0n,
        projectedSpQ6: 9_600n,
        spDamageTaken: spDamage,
        storedHp: 1_000,
        storedPendingHp: 0,
        storedSp: 150,
    };
}

function shot(overrides: Partial<CombatShotSummary> = {}): CombatShotSummary {
    return {
        attempted: true,
        blockedDamage: 0n,
        crit: false,
        dodgeChancePpm: 100_000,
        dodged: false,
        effectiveDamage: 250n,
        effectiveDamageByType: {
            bomb: 0n,
            emp: 0n,
            energy: 0n,
            graygoo: 0n,
            heat: 0n,
            kinetic: 250n,
            shockwave: 0n,
            superchill: 0n,
        },
        hit: true,
        hitChancePpm: 750_000,
        otherEffectiveDamage: 0n,
        rawDamage: 250n,
        ...overrides,
    };
}

function visualization(telemetry: FleetVsFleetCombatTelemetry | FleetVsStarbaseCombatTelemetry | null) {
    return {
        instructionIndex: 1,
        instructionName: telemetry?.kind === 'fleet-vs-fleet' ? 'attackFleet' : 'attackStarbase',
        kind: telemetry?.kind ?? 'fleet-vs-starbase',
        programId: 'C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF',
        telemetry,
    } satisfies CombatVisualization;
}

describe('CombatVisualizer', () => {
    it('renders a typed critical primary strike and delayed starbase return fire', () => {
        const telemetry: FleetVsStarbaseCombatTelemetry = {
            attackerShot: shot({ crit: true }),
            fleet: snapshot({ hpDamage: 75, key: address(1), spDamage: 25 }),
            incrementSequenceId: false,
            kind: 'fleet-vs-starbase',
            retaliationDamage: 100n,
            slot: 123n,
            starbase: snapshot({ hpDamage: 200, key: address(2), spDamage: 50 }),
            starbaseDestroyedOrDowngraded: false,
            starbaseLevelAfter: 5,
            starbaseLevelBefore: 5,
            unixTimestamp: 456n,
            version: 2,
        };

        render(<CombatVisualizer visualization={visualization(telemetry)} />);

        expect(screen.getByTestId('combat-visualizer')).toBeInTheDocument();
        expect(screen.getByText('FLEET // STARBASE')).toBeInTheDocument();
        expect(screen.getByText('AMMO EXPENDED')).toBeInTheDocument();
        expect(screen.getByText('BATTERY DISCHARGE')).toBeInTheDocument();
        expect(screen.getAllByText('KINETIC')).toHaveLength(2);
        expect(screen.getByText('CRIT −50 SP')).toBeInTheDocument();
        expect(screen.getByText('−200 HP')).toBeInTheDocument();
        expect(screen.getByText('−25 SP')).toBeInTheDocument();
        expect(screen.getByText('−75 HP')).toBeInTheDocument();
        expect(screen.getByText('+1.0s RETURN FIRE')).toBeInTheDocument();
    });

    it('conveys dodge and the absence of return fire', () => {
        const telemetry: FleetVsFleetCombatTelemetry = {
            attacker: snapshot({ key: address(3) }),
            attackerShot: shot({ dodged: true, effectiveDamage: 0n, hit: false, rawDamage: 0n }),
            defender: snapshot({ key: address(4) }),
            defenderShot: shot({
                attempted: false,
                effectiveDamage: 0n,
                effectiveDamageByType: null,
                otherEffectiveDamage: null,
                rawDamage: 0n,
            }),
            kind: 'fleet-vs-fleet',
            slot: 123n,
            unixTimestamp: 456n,
            version: 2,
        };

        render(<CombatVisualizer visualization={visualization(telemetry)} />);

        expect(screen.getByText('DODGE')).toBeInTheDocument();
        expect(screen.getAllByText('NO RETURN FIRE')).toHaveLength(2);
    });

    it('still renders the widget when an attack instruction has no finalized telemetry', () => {
        render(<CombatVisualizer visualization={visualization(null)} />);

        expect(screen.getByText('COMBAT INSTRUCTION DETECTED')).toBeInTheDocument();
        expect(screen.getByText('No finalized combat telemetry was emitted')).toBeInTheDocument();
    });
});

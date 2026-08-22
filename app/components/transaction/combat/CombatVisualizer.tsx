'use client';

/* eslint-disable @next/next/no-img-element -- fc-app contact sprites are already-sized transparent PNG art. */

import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { CombatParticipantArt, CombatParticipantKind } from '@utils/combat-art';
import {
    CombatantSnapshot,
    CombatDamageType,
    CombatShotSummary,
    CombatVisualization,
    getAppliedCombatHpDamage,
    getAppliedCombatSpDamage,
    getCombatVisualizations,
    getDominantCombatDamageType,
} from '@utils/combat-telemetry';
import React, { useMemo } from 'react';

import styles from './CombatVisualizer.module.scss';
import { useCombatParticipantArt } from './useCombatParticipantArt';

const DAMAGE_TYPE_COLORS: Readonly<Record<CombatDamageType, string>> = {
    bomb: '#ffd66b',
    emp: '#6f9dff',
    energy: '#62e7ff',
    graygoo: '#76e27d',
    heat: '#ff6654',
    kinetic: '#ffb15c',
    shockwave: '#c98cff',
    superchill: '#a8f3ff',
};

const PRIMARY_COLOR = '#42e8ff';
const COUNTER_COLOR = '#ff6b58';
const SHIELD_COLOR = '#65e8ff';
const HULL_COLOR = '#ff705c';

type Side = 'left' | 'right';
type ParticipantKind = CombatParticipantKind;

type ParticipantArtBySide = Readonly<Partial<Record<Side, CombatParticipantArt>>>;

interface ParticipantView {
    readonly kind: ParticipantKind;
    readonly role: string;
    readonly name: string;
    readonly snapshot: CombatantSnapshot | null;
}

interface FloatingText {
    readonly color: string;
    readonly damageType?: CombatDamageType;
    readonly emphasis?: boolean;
    readonly text: string;
}

interface ShotView {
    readonly attempted: boolean;
    readonly color: string;
    readonly damageTexts: FloatingText[];
    readonly expenseText: string | null;
    readonly source: Side;
    readonly target: Side;
}

export function CombatVisualizerSection({ transactionWithMeta }: { transactionWithMeta: ParsedTransactionWithMeta }) {
    const visualizations = useMemo(() => getCombatVisualizations(transactionWithMeta), [transactionWithMeta]);

    if (visualizations.length === 0) {
        return null;
    }

    return (
        <>
            {visualizations.map(visualization => (
                <CombatVisualizerCard key={visualization.instructionIndex} visualization={visualization} />
            ))}
        </>
    );
}

function CombatVisualizerCard({ visualization }: { visualization: CombatVisualization }) {
    const model = buildReplayModel(visualization);
    const starbaseLevel =
        visualization.telemetry?.kind === 'fleet-vs-starbase' ? visualization.telemetry.starbaseLevelBefore : null;
    const leftArt = useCombatParticipantArt({
        accountKey: model.leftParticipant.snapshot?.key,
        kind: model.leftParticipant.kind,
    });
    const rightArt = useCombatParticipantArt({
        accountKey: model.rightParticipant.snapshot?.key,
        kind: model.rightParticipant.kind,
        starbaseLevel,
    });

    return (
        <div className={`card ${styles.explorerCard}`}>
            <div className={`card-header ${styles.explorerCardHeader}`}>
                <div>
                    <span className={styles.cardEyebrow}>Instruction #{visualization.instructionIndex + 1}</span>
                    <h3 className="card-header-title">Combat Visualizer</h3>
                </div>
                <span
                    className={`badge ${visualization.telemetry ? 'bg-success-soft' : 'bg-secondary-soft'} ${
                        styles.telemetryBadge
                    }`}
                >
                    {visualization.telemetry
                        ? `Telemetry v${visualization.telemetry.version}`
                        : 'Telemetry unavailable'}
                </span>
            </div>
            <CombatVisualizer
                participantArt={{ left: leftArt ?? undefined, right: rightArt ?? undefined }}
                visualization={visualization}
            />
        </div>
    );
}

export function CombatVisualizer({
    participantArt = {},
    visualization,
}: {
    participantArt?: ParticipantArtBySide;
    visualization: CombatVisualization;
}) {
    const model = buildReplayModel(visualization);
    const hasReturnFire = model.returnShot?.attempted === true;
    const summary = buildAccessibleSummary(model.primaryShot, model.returnShot);

    return (
        <section
            aria-label={`${model.title}. ${summary}`}
            className={styles.visualizer}
            data-testid="combat-visualizer"
        >
            <div className={styles.ambientGlow} aria-hidden="true" />
            <div className={styles.hudHeader}>
                <div>
                    <span className={styles.hudEyebrow}>SAGE // COMBAT TELEMETRY</span>
                    <div className={styles.hudTitle}>{model.title}</div>
                </div>
                <div className={styles.replayStatus}>
                    <span className={styles.replayDot} aria-hidden="true" />
                    LOOPING REPLAY
                    {visualization.telemetry && <span>V{visualization.telemetry.version}</span>}
                </div>
            </div>

            <div className={styles.radarViewport}>
                <RadarGrid />
                <div className={styles.scanSweep} aria-hidden="true" />
                <div className={styles.starField} aria-hidden="true">
                    {Array.from({ length: 18 }, (_, index) => (
                        <i key={index} />
                    ))}
                </div>

                <ParticipantHud participant={model.leftParticipant} side="left" />
                <ParticipantHud participant={model.rightParticipant} side="right" />
                <CombatBlip art={participantArt.left} kind={model.leftParticipant.kind} side="left" />
                <CombatBlip art={participantArt.right} kind={model.rightParticipant.kind} side="right" />

                {visualization.telemetry ? (
                    <>
                        <BeamLayer primaryShot={model.primaryShot} returnShot={model.returnShot} />
                        <ShotOverlay phase="primary" shot={model.primaryShot} />
                        {model.returnShot ? (
                            <ShotOverlay phase="return" shot={model.returnShot} />
                        ) : (
                            <div className={styles.noReturnFire}>NO RETURN FIRE</div>
                        )}
                    </>
                ) : (
                    <div className={styles.telemetryUnavailable}>
                        <span>COMBAT INSTRUCTION DETECTED</span>
                        <strong>No finalized combat telemetry was emitted</strong>
                        <small>The transaction may have failed or predate combat telemetry.</small>
                    </div>
                )}
            </div>

            <div className={styles.timeline}>
                <div className={styles.timelineStep}>
                    <span>01</span>
                    <strong>ATTACK</strong>
                </div>
                <div className={styles.timelineTrack} aria-hidden="true">
                    <i />
                    <i />
                </div>
                <div className={`${styles.timelineStep} ${hasReturnFire ? styles.timelineStepActive : ''}`}>
                    <span>02</span>
                    <strong>{hasReturnFire ? 'RETURN FIRE' : 'NO RETURN FIRE'}</strong>
                </div>
                <div className={styles.loopLabel}>AUTO LOOP // 6.8s</div>
            </div>
        </section>
    );
}

function RadarGrid() {
    return (
        <svg aria-hidden="true" className={styles.radarGrid} preserveAspectRatio="none" viewBox="0 0 760 360">
            <defs>
                <radialGradient id="combat-radar-fade">
                    <stop offset="0" stopColor="#56e9ff" stopOpacity="0.12" />
                    <stop offset="0.72" stopColor="#56e9ff" stopOpacity="0.035" />
                    <stop offset="1" stopColor="#56e9ff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="combat-primary-beam" x1="0" x2="1">
                    <stop offset="0" stopColor="#89f3ff" stopOpacity="0" />
                    <stop offset="0.22" stopColor="#89f3ff" />
                    <stop offset="0.78" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#42e8ff" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="combat-counter-beam" x1="1" x2="0">
                    <stop offset="0" stopColor="#ffbd7a" stopOpacity="0" />
                    <stop offset="0.22" stopColor="#ffbd7a" />
                    <stop offset="0.78" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#ff6b58" stopOpacity="0.4" />
                </linearGradient>
            </defs>
            <ellipse cx="380" cy="190" fill="url(#combat-radar-fade)" rx="310" ry="165" />
            {[58, 112, 166].map(radius => (
                <ellipse cx="380" cy="190" fill="none" key={radius} rx={radius * 1.68} ry={radius} />
            ))}
            <path d="M70 190h620M380 25v330M149 72l462 236M149 308L611 72" />
            <path className={styles.radarTicks} d="M380 19v12M380 349v12M64 190h12M684 190h12" />
        </svg>
    );
}

function ParticipantHud({ participant, side }: { participant: ParticipantView; side: Side }) {
    const snapshot = participant.snapshot;
    const hpPercent = snapshot?.maxHp ? Math.max(0, Math.min(100, (snapshot.finalHp / snapshot.maxHp) * 100)) : 0;

    return (
        <div className={`${styles.participantHud} ${side === 'left' ? styles.leftHud : styles.rightHud}`}>
            <span className={styles.participantRole}>{participant.role}</span>
            <strong>{participant.name}</strong>
            {snapshot ? (
                <>
                    <span className={styles.participantKey} title={snapshot.key}>
                        {shortAddress(snapshot.key)}
                    </span>
                    <div className={styles.vitals}>
                        <div className={styles.hullTrack}>
                            <i style={{ width: `${hpPercent}%` }} />
                        </div>
                        <span>HP {formatNumber(BigInt(snapshot.finalHp))}</span>
                        <span>SP {formatNumber(BigInt(snapshot.finalSp))}</span>
                    </div>
                </>
            ) : (
                <span className={styles.participantKey}>AWAITING TELEMETRY</span>
            )}
        </div>
    );
}

function CombatBlip({ art, kind, side }: { art?: CombatParticipantArt; kind: ParticipantKind; side: Side }) {
    return (
        <div
            aria-label={`${side === 'left' ? 'Attacking' : 'Defending'} ${kind}${art ? `: ${art.alt}` : ''}`}
            className={`${styles.blip} ${side === 'left' ? styles.leftBlip : styles.rightBlip} ${
                kind === 'starbase' ? styles.starbaseBlip : styles.fleetBlip
            }`}
            title={art?.alt}
        >
            <i className={styles.blipRing} aria-hidden="true" />
            {art ? (
                <img alt="" aria-hidden="true" className={styles.contactSprite} draggable={false} src={art.src} />
            ) : kind === 'starbase' ? (
                <svg aria-hidden="true" viewBox="0 0 48 48">
                    <path d="M24 3l13 8v8l8 5-8 5v8l-13 8-13-8v-8l-8-5 8-5v-8z" />
                    <circle cx="24" cy="24" r="7" />
                    <path d="M24 10v7M24 31v7M10 24h7M31 24h7" />
                </svg>
            ) : (
                <svg aria-hidden="true" viewBox="0 0 52 42">
                    <path d="M47 21L7 4l7 17-7 17z" />
                    <path d="M13 21H2M20 16l15 5-15 5z" />
                </svg>
            )}
            {art && <span className={styles.contactCaption}>{art.caption}</span>}
        </div>
    );
}

function BeamLayer({ primaryShot, returnShot }: { primaryShot: ShotView; returnShot: ShotView | null }) {
    return (
        <svg aria-hidden="true" className={styles.beamLayer} preserveAspectRatio="none" viewBox="0 0 760 360">
            {primaryShot.attempted && (
                <>
                    <path className={styles.primaryBeamGlow} d="M205 235L560 128" pathLength="100" />
                    <path className={styles.primaryBeam} d="M205 235L560 128" pathLength="100" />
                    <g className={styles.primaryImpact}>
                        <circle cx="560" cy="128" r="9" />
                        <circle cx="560" cy="128" r="18" />
                        <path d="M530 128h60M560 98v60" />
                    </g>
                </>
            )}
            {returnShot?.attempted && (
                <>
                    <path className={styles.counterBeamGlow} d="M560 128L205 235" pathLength="100" />
                    <path className={styles.counterBeam} d="M560 128L205 235" pathLength="100" />
                    <g className={styles.counterImpact}>
                        <circle cx="205" cy="235" r="9" />
                        <circle cx="205" cy="235" r="18" />
                        <path d="M175 235h60M205 205v60" />
                    </g>
                </>
            )}
        </svg>
    );
}

function ShotOverlay({ phase, shot }: { phase: 'primary' | 'return'; shot: ShotView }) {
    const isPrimary = phase === 'primary';
    const sourceClass = shot.source === 'left' ? styles.leftSourceText : styles.rightSourceText;
    const targetClass = shot.target === 'left' ? styles.leftTargetText : styles.rightTargetText;
    const phaseClass = isPrimary ? styles.primaryPhase : styles.returnPhase;

    return (
        <>
            {shot.expenseText && (
                <div className={`${styles.floatingExpense} ${sourceClass} ${phaseClass}`} style={{ color: shot.color }}>
                    {shot.expenseText}
                </div>
            )}
            <div className={`${styles.floatingDamageStack} ${targetClass} ${phaseClass}`}>
                {shot.damageTexts.map((damageText, index) => (
                    <div
                        className={`${styles.floatingDamage} ${damageText.emphasis ? styles.emphasis : ''}`}
                        key={`${damageText.text}-${index}`}
                        style={{ animationDelay: `${index * 110}ms`, color: damageText.color }}
                    >
                        {damageText.damageType && (
                            <span className={styles.damageType}>{damageText.damageType.toUpperCase()}</span>
                        )}
                        <strong>{damageText.text}</strong>
                    </div>
                ))}
            </div>
        </>
    );
}

function buildReplayModel(visualization: CombatVisualization) {
    const telemetry = visualization.telemetry;
    const title = visualization.kind === 'fleet-vs-fleet' ? 'FLEET // FLEET' : 'FLEET // STARBASE';

    if (!telemetry) {
        return {
            leftParticipant: participant('fleet', 'ATTACKER', 'Attacking Fleet', null),
            primaryShot: emptyShot('left', 'right', PRIMARY_COLOR),
            returnShot: null,
            rightParticipant: participant(
                visualization.kind === 'fleet-vs-fleet' ? 'fleet' : 'starbase',
                'DEFENDER',
                visualization.kind === 'fleet-vs-fleet' ? 'Defending Fleet' : 'Defending Starbase',
                null
            ),
            title,
        };
    }

    if (telemetry.kind === 'fleet-vs-fleet') {
        const primaryAttempted = telemetry.attackerShot.attempted !== false;
        const returnAttempted = wasShotAttempted(telemetry.defenderShot);
        return {
            leftParticipant: participant('fleet', 'ATTACKER', 'Attacking Fleet', telemetry.attacker),
            primaryShot: buildShotView({
                attempted: primaryAttempted,
                color: PRIMARY_COLOR,
                expenseText: primaryAttempted ? 'AMMO EXPENDED' : null,
                shot: telemetry.attackerShot,
                source: 'left',
                target: telemetry.defender,
                targetSide: 'right',
            }),
            returnShot: returnAttempted
                ? buildShotView({
                      attempted: true,
                      color: COUNTER_COLOR,
                      expenseText: 'AMMO EXPENDED',
                      shot: telemetry.defenderShot,
                      source: 'right',
                      target: telemetry.attacker,
                      targetSide: 'left',
                  })
                : null,
            rightParticipant: participant('fleet', 'DEFENDER', 'Defending Fleet', telemetry.defender),
            title,
        };
    }

    const primaryAttempted = telemetry.attackerShot.attempted !== false;
    const returnAttempted = telemetry.retaliationDamage > 0n;
    const primaryShot = buildShotView({
        attempted: primaryAttempted,
        color: PRIMARY_COLOR,
        expenseText: primaryAttempted ? 'AMMO EXPENDED' : null,
        shot: telemetry.attackerShot,
        source: 'left',
        target: telemetry.starbase,
        targetSide: 'right',
    });

    if (telemetry.starbaseDestroyedOrDowngraded) {
        primaryShot.damageTexts.push({
            color: '#ffd66b',
            emphasis: true,
            text:
                telemetry.starbaseLevelAfter < telemetry.starbaseLevelBefore
                    ? `DOWNGRADED T${telemetry.starbaseLevelBefore} → T${telemetry.starbaseLevelAfter}`
                    : 'STARBASE DISRUPTED',
        });
    }

    return {
        leftParticipant: participant('fleet', 'ATTACKER', 'Attacking Fleet', telemetry.fleet),
        primaryShot,
        returnShot: returnAttempted
            ? buildShotView({
                  attempted: true,
                  color: COUNTER_COLOR,
                  expenseText: 'BATTERY DISCHARGE',
                  rawDamageHint: telemetry.retaliationDamage,
                  shot: null,
                  source: 'right',
                  target: telemetry.fleet,
                  targetSide: 'left',
              })
            : null,
        rightParticipant: participant('starbase', 'DEFENDER', 'Defending Starbase', telemetry.starbase),
        title,
    };
}

function participant(
    kind: ParticipantKind,
    role: string,
    name: string,
    snapshot: CombatantSnapshot | null
): ParticipantView {
    return { kind, name, role, snapshot };
}

function emptyShot(source: Side, target: Side, color: string): ShotView {
    return { attempted: false, color, damageTexts: [], expenseText: null, source, target };
}

function buildShotView({
    attempted,
    color,
    expenseText,
    rawDamageHint = 0n,
    shot,
    source,
    target,
    targetSide,
}: {
    attempted: boolean;
    color: string;
    expenseText: string | null;
    rawDamageHint?: bigint;
    shot: CombatShotSummary | null;
    source: Side;
    target: CombatantSnapshot;
    targetSide: Side;
}): ShotView {
    return {
        attempted,
        color,
        damageTexts: getFloatingCombatText(attempted, shot, target, rawDamageHint),
        expenseText,
        source,
        target: targetSide,
    };
}

function getFloatingCombatText(
    attempted: boolean,
    shot: CombatShotSummary | null,
    target: CombatantSnapshot,
    rawDamageHint: bigint
): FloatingText[] {
    if (!attempted) {
        return [{ color: '#aabdc5', text: 'NO SHOT' }];
    }
    if (shot?.dodged) {
        return [{ color: '#7dffbd', text: 'DODGE' }];
    }
    if (shot && !shot.hit) {
        return [{ color: '#cceef7', text: 'MISS' }];
    }

    const spDamage = getAppliedCombatSpDamage(target);
    const hpDamage = getAppliedCombatHpDamage(target);
    if (spDamage === 0n && hpDamage === 0n) {
        if ((shot?.rawDamage ?? rawDamageHint) > 0n || (shot?.blockedDamage ?? 0n) > 0n) {
            return [{ color: '#b9c8d0', emphasis: shot?.crit, text: shot?.crit ? 'CRIT // BLOCKED' : 'BLOCKED' }];
        }
        return [{ color: '#b9c8d0', text: 'NO DAMAGE' }];
    }

    const damageType = getDominantCombatDamageType(shot);
    const typedColor = damageType ? DAMAGE_TYPE_COLORS[damageType] : null;
    const values: FloatingText[] = [];

    if (spDamage > 0n) {
        values.push({
            color: typedColor ?? SHIELD_COLOR,
            damageType: damageType ?? undefined,
            emphasis: shot?.crit,
            text: `${shot?.crit ? 'CRIT ' : ''}−${formatNumber(spDamage)} SP`,
        });
    }
    if (hpDamage > 0n) {
        values.push({
            color: typedColor ?? HULL_COLOR,
            damageType: damageType ?? undefined,
            emphasis: shot?.crit && values.length === 0,
            text: `${shot?.crit && values.length === 0 ? 'CRIT ' : ''}−${formatNumber(hpDamage)} HP`,
        });
    }
    if (target.destroyed) {
        values.push({ color: '#ff496d', emphasis: true, text: 'DESTROYED' });
    }

    return values;
}

function wasShotAttempted(shot: CombatShotSummary): boolean {
    if (shot.attempted !== null) {
        return shot.attempted;
    }
    return shot.rawDamage > 0n || shot.blockedDamage > 0n || shot.effectiveDamage > 0n || shot.dodged;
}

function buildAccessibleSummary(primaryShot: ShotView, returnShot: ShotView | null): string {
    const primary = primaryShot.damageTexts.map(text => text.text).join(', ') || 'no primary shot';
    const counter = returnShot?.damageTexts.map(text => text.text).join(', ') || 'no return fire';
    return `Primary result: ${primary}. Return result: ${counter}.`;
}

function shortAddress(address: string): string {
    return `${address.slice(0, 5)}…${address.slice(-5)}`;
}

function formatNumber(value: bigint): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

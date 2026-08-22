'use client';

/* eslint-disable @next/next/no-img-element -- fc-app contact sprites are already-sized transparent PNG art. */

import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { CombatParticipantKind, formatCombatFaction } from '@utils/combat-art';
import {
    CombatantSnapshot,
    CombatDamageType,
    CombatShotSummary,
    CombatVisualization,
    FleetApSnapshot,
    getAppliedCombatHpDamage,
    getAppliedCombatSpDamage,
    getCombatVisualizations,
    getDominantCombatDamageType,
} from '@utils/combat-telemetry';
import React, { CSSProperties, useMemo } from 'react';

import styles from './CombatVisualizer.module.scss';
import { CombatParticipantEnrichment, useCombatParticipantArt } from './useCombatParticipantArt';

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

type ParticipantEnrichmentBySide = Readonly<Partial<Record<Side, Partial<CombatParticipantEnrichment>>>>;

interface ParticipantView {
    readonly ap: FleetApSnapshot | null;
    readonly factionId: number | null;
    readonly kind: ParticipantKind;
    readonly role: string;
    readonly name: string;
    readonly representativeShipConfigId: number | null;
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
    const participantEnrichment = useCombatParticipantArt({
        left: {
            accountKey: model.leftParticipant.snapshot?.key,
            kind: model.leftParticipant.kind,
            representativeShipConfigId: model.leftParticipant.representativeShipConfigId,
        },
        right: {
            accountKey: model.rightParticipant.snapshot?.key,
            kind: model.rightParticipant.kind,
            representativeShipConfigId: model.rightParticipant.representativeShipConfigId,
            starbaseFactionId: model.rightParticipant.factionId,
            starbaseLevel,
        },
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
            <CombatVisualizer participantEnrichment={participantEnrichment} visualization={visualization} />
        </div>
    );
}

export function CombatVisualizer({
    participantEnrichment = {},
    visualization,
}: {
    participantEnrichment?: ParticipantEnrichmentBySide;
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

                <ParticipantHud
                    enrichment={participantEnrichment.left}
                    impactPhase={model.returnShot?.attempted ? 'return' : 'none'}
                    participant={model.leftParticipant}
                    side="left"
                />
                <ParticipantHud
                    enrichment={participantEnrichment.right}
                    impactPhase={model.primaryShot.attempted ? 'primary' : 'none'}
                    participant={model.rightParticipant}
                    side="right"
                />
                <CombatBlip enrichment={participantEnrichment.left} kind={model.leftParticipant.kind} side="left" />
                <CombatBlip enrichment={participantEnrichment.right} kind={model.rightParticipant.kind} side="right" />

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

type ImpactPhase = 'none' | 'primary' | 'return';

type VitalStyle = CSSProperties & {
    '--vital-end-width': string;
    '--vital-start-width': string;
};

function ParticipantHud({
    enrichment,
    impactPhase,
    participant,
    side,
}: {
    enrichment?: Partial<CombatParticipantEnrichment>;
    impactPhase: ImpactPhase;
    participant: ParticipantView;
    side: Side;
}) {
    const snapshot = participant.snapshot;
    const ownerLabel = enrichment?.profileName ? `@${enrichment.profileName.replace(/^@/, '')}` : null;
    const factionLabel = formatCombatFaction(participant.factionId);

    return (
        <div className={`${styles.participantHud} ${side === 'left' ? styles.leftHud : styles.rightHud}`}>
            <span className={styles.participantRole}>{participant.role}</span>
            <strong>{participant.name}</strong>
            {snapshot ? (
                <>
                    {(ownerLabel || factionLabel) && (
                        <div className={styles.participantIdentity}>
                            {ownerLabel && (
                                <span className={styles.profileName} title={enrichment?.ownerProfile ?? undefined}>
                                    {ownerLabel}
                                </span>
                            )}
                            {factionLabel && <span className={styles.factionBadge}>{factionLabel}</span>}
                        </div>
                    )}
                    <span className={styles.participantKey} title={snapshot.key}>
                        {shortAddress(snapshot.key)}
                    </span>
                    {participant.ap && (
                        <span
                            aria-label={`Ability power ${participant.ap.before} before combat, ${participant.ap.after} after combat`}
                            className={styles.apReadout}
                        >
                            AP {formatNumber(BigInt(participant.ap.before))} →{' '}
                            {formatNumber(BigInt(participant.ap.after))}
                        </span>
                    )}
                    <div className={styles.vitals}>
                        <VitalBar
                            end={BigInt(snapshot.postHp)}
                            impactPhase={impactPhase}
                            kind="hp"
                            maximum={BigInt(snapshot.maxHp)}
                            start={projectedWhole(snapshot.projectedHpQ6)}
                        />
                        <VitalBar
                            end={BigInt(snapshot.postSp)}
                            impactPhase={impactPhase}
                            kind="sp"
                            maximum={projectedWhole(snapshot.projectedSpQ6)}
                            start={projectedWhole(snapshot.projectedSpQ6)}
                        />
                    </div>
                </>
            ) : (
                <span className={styles.participantKey}>AWAITING TELEMETRY</span>
            )}
        </div>
    );
}

function VitalBar({
    end,
    impactPhase,
    kind,
    maximum,
    start,
}: {
    end: bigint;
    impactPhase: ImpactPhase;
    kind: 'hp' | 'sp';
    maximum: bigint;
    start: bigint;
}) {
    const label = kind.toUpperCase();
    const style: VitalStyle = {
        '--vital-end-width': `${vitalPercent(end, maximum)}%`,
        '--vital-start-width': `${vitalPercent(start, maximum)}%`,
    };

    return (
        <div
            aria-label={`${label} ${formatNumber(start)} before impact, ${formatNumber(end)} after impact`}
            className={`${styles.vitalRow} ${
                impactPhase === 'primary' ? styles.primaryVital : impactPhase === 'return' ? styles.returnVital : ''
            }`}
            style={style}
        >
            <div className={styles.vitalHeader} aria-hidden="true">
                <span>{label}</span>
                <span className={styles.vitalValue}>
                    <span className={styles.vitalStartValue}>{formatNumber(start)}</span>
                    <span className={styles.vitalEndValue}>{formatNumber(end)}</span>
                </span>
            </div>
            <div className={styles.vitalTrack} aria-hidden="true">
                <i className={kind === 'hp' ? styles.hpFill : styles.spFill} />
            </div>
        </div>
    );
}

function CombatBlip({
    enrichment,
    kind,
    side,
}: {
    enrichment?: Partial<CombatParticipantEnrichment>;
    kind: ParticipantKind;
    side: Side;
}) {
    const art = enrichment?.art;
    const additionalShips = kind === 'fleet' ? enrichment?.additionalShipCount : null;
    const shipCountLabel =
        additionalShips !== null && additionalShips !== undefined ? ` (+${formatNumber(additionalShips)} ships)` : '';
    const caption = art ? `${art.caption}${shipCountLabel}` : shipCountLabel ? `FLEET${shipCountLabel}` : null;

    return (
        <div
            aria-label={`${side === 'left' ? 'Attacking' : 'Defending'} ${kind}${art ? `: ${art.alt}` : ''}${
                additionalShips !== null && additionalShips !== undefined
                    ? `, plus ${formatNumber(additionalShips)} additional ships`
                    : ''
            }`}
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
            {caption && <span className={styles.contactCaption}>{caption}</span>}
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
            leftParticipant: participant('fleet', 'ATTACKER', 'Attacking Fleet', telemetry.attacker, {
                ap: telemetry.attackerAp,
                factionId: telemetry.attackerIdentity?.factionId ?? null,
                representativeShipConfigId: telemetry.attackerIdentity?.shipConfigId ?? null,
            }),
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
            rightParticipant: participant('fleet', 'DEFENDER', 'Defending Fleet', telemetry.defender, {
                ap: telemetry.defenderAp,
                factionId: telemetry.defenderIdentity?.factionId ?? null,
                representativeShipConfigId: telemetry.defenderIdentity?.shipConfigId ?? null,
            }),
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
        leftParticipant: participant('fleet', 'ATTACKER', 'Attacking Fleet', telemetry.fleet, {
            ap: telemetry.fleetAp,
            factionId: telemetry.fleetIdentity?.factionId ?? null,
            representativeShipConfigId: telemetry.fleetIdentity?.shipConfigId ?? null,
        }),
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
        rightParticipant: participant('starbase', 'DEFENDER', 'Defending Starbase', telemetry.starbase, {
            factionId: telemetry.starbaseFactionId,
        }),
        title,
    };
}

function participant(
    kind: ParticipantKind,
    role: string,
    name: string,
    snapshot: CombatantSnapshot | null,
    enrichment: {
        ap?: FleetApSnapshot | null;
        factionId?: number | null;
        representativeShipConfigId?: number | null;
    } = {}
): ParticipantView {
    return {
        ap: enrichment.ap ?? null,
        factionId: enrichment.factionId ?? null,
        kind,
        name,
        representativeShipConfigId: enrichment.representativeShipConfigId ?? null,
        role,
        snapshot,
    };
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

function projectedWhole(valueQ6: bigint): bigint {
    return valueQ6 / 64n;
}

function vitalPercent(value: bigint, maximum: bigint): number {
    if (maximum <= 0n || value <= 0n) {
        return 0;
    }
    const basisPoints = (value * 10_000n) / maximum;
    return Number(basisPoints > 10_000n ? 10_000n : basisPoints) / 100;
}

function formatNumber(value: bigint): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

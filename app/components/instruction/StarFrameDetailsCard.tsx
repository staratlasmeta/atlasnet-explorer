import { Address } from '@components/common/Address';
import {
    ParsedInstruction,
    PartiallyDecodedInstruction,
    PublicKey,
    SignatureResult,
    TransactionInstruction,
} from '@solana/web3.js';
import { ExpandableRow } from '@utils/anchor';
import { GalaxyNftMetadata, getGalaxyMintMetadata } from '@utils/galaxy';
import { camelToTitleCase } from '@utils/index';
import {
    buildSageCargoMovements,
    buildSageTokenAccountMovements,
    getSageCargoGameData,
    SageCargoGameData,
    SageCargoMovement,
    SageTokenBalanceDelta,
} from '@utils/sage-cargo';
import {
    decodeStarFrameInstruction,
    getStarFrameTypeLabel,
    StarFrameDecodedArgument,
    StarFrameValue,
    stringifyStarFrameValue,
} from '@utils/starframe';
import React, { ReactNode, useMemo, useState } from 'react';
import { CornerDownRight } from 'react-feather';
import useAsyncEffect from 'use-async-effect';

import { InstructionCard } from './InstructionCard';

export default function StarFrameDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    signature: string;
    innerCards?: JSX.Element[];
    innerInstructions?: (ParsedInstruction | PartiallyDecodedInstruction)[];
    childIndex?: number;
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>;
    url?: string;
}) {
    const { ix } = props;
    const decodedInstruction = useMemo(() => decodeStarFrameInstruction(ix), [ix]);
    const programName = decodedInstruction?.program.displayName ?? 'StarFrame';
    const instructionName = decodedInstruction?.instruction?.name ?? 'Unknown Instruction';
    const cardTitle = `${programName}: ${camelToTitleCase(instructionName)}`;

    return (
        <InstructionCard title={cardTitle} {...props}>
            <StarFrameDetails
                ix={ix}
                decodedInstruction={decodedInstruction}
                innerInstructions={props.innerInstructions}
                tokenBalanceDeltas={props.tokenBalanceDeltas}
                url={props.url}
            />
        </InstructionCard>
    );
}

function StarFrameDetails({
    ix,
    decodedInstruction,
    innerInstructions,
    tokenBalanceDeltas,
    url,
}: {
    ix: TransactionInstruction;
    decodedInstruction: ReturnType<typeof decodeStarFrameInstruction>;
    innerInstructions?: (ParsedInstruction | PartiallyDecodedInstruction)[];
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>;
    url?: string;
}) {
    const galaxyMetadata = useGalaxyMintMetadata();
    const cargoGameData = useSageCargoGameData(ix, decodedInstruction, url);
    const cargoMovements = useMemo(() => {
        if (!decodedInstruction) {
            return [];
        }

        return [
            ...buildSageCargoMovements(decodedInstruction, cargoGameData),
            ...buildSageTokenAccountMovements({
                decodedInstruction,
                innerInstructions,
                ix,
                tokenBalanceDeltas,
            }),
        ];
    }, [cargoGameData, decodedInstruction, innerInstructions, ix, tokenBalanceDeltas]);

    if (!decodedInstruction) {
        return (
            <tr>
                <td colSpan={3} className="text-lg-center">
                    Failed to decode instruction according to the bundled StarFrame IDL registry
                </td>
            </tr>
        );
    }

    const programName = decodedInstruction.program.displayName;
    const accounts = decodedInstruction.instruction?.accounts ?? [];

    return (
        <>
            <tr>
                <td>Program</td>
                <td className="text-lg-end" colSpan={2}>
                    <Address pubkey={ix.programId} alignRight link raw overrideText={programName} />
                </td>
            </tr>
            <tr className="table-sep">
                <td>Account Name</td>
                <td className="text-lg-end" colSpan={2}>
                    Address
                </td>
            </tr>
            {ix.keys.map(({ pubkey, isSigner, isWritable }, keyIndex) => {
                const account = accounts[keyIndex];
                return (
                    <tr key={keyIndex}>
                        <td>
                            <div className="me-2 d-md-inline">
                                {account
                                    ? camelToTitleCase(account.name)
                                    : `Remaining Account #${keyIndex + 1 - accounts.length}`}
                            </div>
                            {account?.isOptional && <span className="badge bg-secondary-soft me-1">Optional</span>}
                            {isWritable && <span className="badge bg-danger-soft me-1">Writable</span>}
                            {isSigner && <span className="badge bg-info-soft me-1">Signer</span>}
                        </td>
                        <td className="text-lg-end" colSpan={2}>
                            <StarFrameAddress pubkey={pubkey} metadataMap={galaxyMetadata} />
                        </td>
                    </tr>
                );
            })}

            {decodedInstruction.status === 'error' && (
                <>
                    <tr className="table-sep">
                        <td colSpan={3}>Decode Error</td>
                    </tr>
                    <tr>
                        <td colSpan={3} className="text-danger">
                            {decodedInstruction.error}
                        </td>
                    </tr>
                </>
            )}

            {cargoMovements.length > 0 && (
                <CargoMovementRows
                    cargoGameData={cargoGameData}
                    galaxyMetadata={galaxyMetadata}
                    movements={cargoMovements}
                />
            )}

            {decodedInstruction.arguments.length > 0 && (
                <>
                    <tr className="table-sep">
                        <td>Argument Name</td>
                        <td>Type</td>
                        <td className="text-lg-end">Value</td>
                    </tr>
                    {decodedInstruction.arguments.map((argument, index) => (
                        <React.Fragment key={argument.name}>
                            {mapArgumentToRows(argument, `${index}`, 0, galaxyMetadata)}
                        </React.Fragment>
                    ))}
                </>
            )}
        </>
    );
}

function useGalaxyMintMetadata() {
    const [metadata, setMetadata] = useState<Map<string, GalaxyNftMetadata>>(new Map());

    useAsyncEffect(async isMounted => {
        const fetchedMetadata = await getGalaxyMintMetadata();
        if (isMounted()) {
            setMetadata(fetchedMetadata);
        }
    }, []);

    return metadata;
}

function useSageCargoGameData(
    ix: TransactionInstruction,
    decodedInstruction: ReturnType<typeof decodeStarFrameInstruction>,
    url?: string
) {
    const [cargoGameData, setCargoGameData] = useState<SageCargoGameData>({
        cargoTypeByMint: new Map(),
        cargoTypes: new Map(),
        resources: {},
    });
    const gameAddresses = useMemo(
        () => getInstructionAccountAddressCandidates(ix, decodedInstruction, 'game'),
        [decodedInstruction, ix]
    );
    const gameAddressKey = gameAddresses.join(',');

    useAsyncEffect(
        async isMounted => {
            if (gameAddresses.length === 0 || !url) {
                setCargoGameData({ cargoTypeByMint: new Map(), cargoTypes: new Map(), resources: {} });
                return;
            }

            let fetchedCargoGameData: SageCargoGameData = {
                cargoTypeByMint: new Map(),
                cargoTypes: new Map(),
                resources: {},
            };

            for (const gameAddress of gameAddresses) {
                fetchedCargoGameData = await getSageCargoGameData(gameAddress, url);
                if (hasSageCargoGameData(fetchedCargoGameData)) {
                    break;
                }
            }

            if (isMounted()) {
                setCargoGameData(fetchedCargoGameData);
            }
        },
        [gameAddressKey, url]
    );

    return cargoGameData;
}

function getInstructionAccountAddressCandidates(
    ix: TransactionInstruction,
    decodedInstruction: ReturnType<typeof decodeStarFrameInstruction>,
    accountName: string
): string[] {
    const accounts = decodedInstruction?.instruction?.accounts ?? [];
    const accountIndex = accounts.findIndex(account => account.name === accountName);
    if (accountIndex === undefined || accountIndex < 0) {
        return [];
    }

    const omittedOptionalAccounts = Math.max(accounts.length - ix.keys.length, 0);
    const optionalAccountsBeforeTarget = accounts.slice(0, accountIndex).filter(account => account.isOptional).length;
    const maxOmittedBeforeTarget = Math.min(omittedOptionalAccounts, optionalAccountsBeforeTarget);
    const candidates: string[] = [];

    for (let omittedBeforeTarget = 0; omittedBeforeTarget <= maxOmittedBeforeTarget; omittedBeforeTarget++) {
        const key = ix.keys[accountIndex - omittedBeforeTarget]?.pubkey.toBase58();
        if (key && !candidates.includes(key)) {
            candidates.push(key);
        }
    }

    return candidates;
}

function hasSageCargoGameData(cargoGameData: SageCargoGameData): boolean {
    return (
        cargoGameData.cargoTypes.size > 0 ||
        cargoGameData.cargoTypeByMint.size > 0 ||
        Object.values(cargoGameData.resources).some(resource => resource !== undefined)
    );
}

function CargoMovementRows({
    cargoGameData,
    galaxyMetadata,
    movements,
}: {
    cargoGameData: SageCargoGameData;
    galaxyMetadata: Map<string, GalaxyNftMetadata>;
    movements: SageCargoMovement[];
}) {
    return (
        <>
            <tr className="table-sep">
                <td>Movement</td>
                <td>Item</td>
                <td className="text-lg-end">Amount</td>
            </tr>
            {movements.map((movement, index) => (
                <tr key={`${movement.route}-${movement.cargoId ?? movement.mint ?? movement.fallbackName}-${index}`}>
                    <td>{movement.route}</td>
                    <td>
                        <CargoItemLabel
                            cargoGameData={cargoGameData}
                            cargoId={movement.cargoId}
                            fallbackName={movement.fallbackName}
                            galaxyMetadata={galaxyMetadata}
                            mint={movement.mint}
                        />
                    </td>
                    <td className="text-lg-end">{formatCargoAmount(movement.amount, movement.decimals)}</td>
                </tr>
            ))}
        </>
    );
}

function CargoItemLabel({
    cargoGameData,
    cargoId,
    fallbackName,
    galaxyMetadata,
    mint,
}: {
    cargoGameData: SageCargoGameData;
    cargoId?: number;
    fallbackName?: string;
    galaxyMetadata: Map<string, GalaxyNftMetadata>;
    mint?: string;
}) {
    const cargoType =
        cargoId === undefined
            ? mint
                ? cargoGameData.cargoTypeByMint.get(mint)
                : undefined
            : cargoGameData.cargoTypes.get(cargoId);
    const itemMint = cargoType?.mint ?? mint;
    const metadata = itemMint ? galaxyMetadata.get(itemMint) : undefined;
    const label =
        (metadata ? getGalaxyMetadataLabel(metadata) : cargoType?.name ?? fallbackName) ??
        (cargoId === undefined
            ? itemMint
                ? `Token ${shortenAddress(itemMint)}`
                : 'Unknown Cargo'
            : `Cargo #${cargoId}`);

    return (
        <div className="d-flex align-items-center gap-2">
            {metadata && <ItemIcon metadata={metadata} />}
            {itemMint ? <Address pubkey={new PublicKey(itemMint)} link overrideText={label} /> : <span>{label}</span>}
        </div>
    );
}

function formatCargoAmount(amount: bigint, decimals = 0): string {
    if (decimals <= 0) {
        return formatWholeAmount(amount.toString());
    }

    const sign = amount < 0n ? '-' : '';
    const rawAmount = amount < 0n ? -amount : amount;
    const paddedAmount = rawAmount.toString().padStart(decimals + 1, '0');
    const whole = paddedAmount.slice(0, -decimals);
    const fraction = paddedAmount.slice(-decimals).replace(/0+$/, '');

    return `${sign}${formatWholeAmount(whole)}${fraction ? `.${fraction}` : ''}`;
}

function formatWholeAmount(value: string): string {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function shortenAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function mapArgumentToRows(
    argument: StarFrameDecodedArgument,
    key: string,
    nestingLevel: number,
    galaxyMetadata: Map<string, GalaxyNftMetadata>
) {
    return mapValueToRows(
        camelToTitleCase(argument.name),
        getStarFrameTypeLabel(argument.type),
        argument.value,
        key,
        nestingLevel,
        galaxyMetadata
    );
}

function mapValueToRows(
    fieldName: string,
    fieldType: string,
    value: StarFrameValue,
    key: string,
    nestingLevel: number,
    galaxyMetadata: Map<string, GalaxyNftMetadata>
): ReactNode {
    if (Array.isArray(value)) {
        return (
            <ExpandableRow
                key={key}
                fieldName={fieldName}
                fieldType={`${fieldType}[${value.length}]`}
                nestingLevel={nestingLevel}
            >
                {value.map((item, index) =>
                    mapValueToRows(
                        `#${index}`,
                        inferStarFrameValueType(item),
                        item,
                        `${key}-${index}`,
                        nestingLevel + 1,
                        galaxyMetadata
                    )
                )}
            </ExpandableRow>
        );
    }

    if (isEnumEmptyVariant(value)) {
        return (
            <SimpleRow key={key} fieldName={fieldName} fieldType={fieldType} nestingLevel={nestingLevel}>
                {camelToTitleCase(value.variant)}
            </SimpleRow>
        );
    }

    if (isEnumTupleVariant(value)) {
        return (
            <ExpandableRow
                key={key}
                fieldName={fieldName}
                fieldType={`${fieldType}: ${camelToTitleCase(value.variant)}`}
                nestingLevel={nestingLevel}
            >
                {mapValueToRows(
                    'Value',
                    inferStarFrameValueType(value.value),
                    value.value,
                    `${key}-value`,
                    nestingLevel + 1,
                    galaxyMetadata
                )}
            </ExpandableRow>
        );
    }

    if (isRecord(value)) {
        return (
            <ExpandableRow key={key} fieldName={fieldName} fieldType={fieldType} nestingLevel={nestingLevel}>
                {Object.entries(value).map(([childKey, childValue], index) =>
                    mapValueToRows(
                        camelToTitleCase(childKey),
                        inferStarFrameValueType(childValue),
                        childValue,
                        `${key}-${index}`,
                        nestingLevel + 1,
                        galaxyMetadata
                    )
                )}
            </ExpandableRow>
        );
    }

    return (
        <SimpleRow key={key} fieldName={fieldName} fieldType={fieldType} nestingLevel={nestingLevel}>
            {formatSimpleValue(value, fieldType, galaxyMetadata)}
        </SimpleRow>
    );
}

function SimpleRow({
    fieldName,
    fieldType,
    nestingLevel,
    children,
}: {
    fieldName: string;
    fieldType: string;
    nestingLevel: number;
    children: ReactNode;
}) {
    return (
        <tr style={nestingLevel === 0 ? undefined : { backgroundColor: '#141816' }}>
            <td className="d-flex flex-row">
                {nestingLevel > 0 && (
                    <span style={{ paddingLeft: `${15 * nestingLevel}px` }}>
                        <CornerDownRight className="me-2" size={15} />
                    </span>
                )}
                <div>{fieldName}</div>
            </td>
            <td>{fieldType}</td>
            <td className="text-lg-end">{children}</td>
        </tr>
    );
}

function formatSimpleValue(
    value: StarFrameValue,
    fieldType: string,
    galaxyMetadata: Map<string, GalaxyNftMetadata>
): ReactNode {
    if (typeof value === 'string' && fieldType === 'PublicKey') {
        return <StarFrameAddress pubkey={new PublicKey(value)} metadataMap={galaxyMetadata} />;
    }

    return stringifyStarFrameValue(value);
}

function StarFrameAddress({ pubkey, metadataMap }: { pubkey: PublicKey; metadataMap: Map<string, GalaxyNftMetadata> }) {
    const metadata = metadataMap.get(pubkey.toBase58());

    if (!metadata) {
        return <Address pubkey={pubkey} alignRight link />;
    }

    const label = getGalaxyMetadataLabel(metadata);

    return (
        <div className="d-flex align-items-center justify-content-end gap-2">
            <ItemIcon metadata={metadata} />
            <Address pubkey={pubkey} link overrideText={label} />
        </div>
    );
}

function getGalaxyMetadataLabel(metadata: GalaxyNftMetadata): string {
    return metadata.symbol && metadata.symbol !== metadata.name
        ? `${metadata.symbol} - ${metadata.name}`
        : metadata.name;
}

function ItemIcon({ metadata }: { metadata: GalaxyNftMetadata }) {
    const imageUrl = metadata.media?.thumbnailUrl || metadata.image;
    if (!imageUrl) {
        return null;
    }

    return (
        // Galaxy item icons can come from multiple asset hosts, so keep this as a plain image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
            alt={`${metadata.name} icon`}
            className="rounded-circle border border-4 border-gray-dark"
            height={18}
            src={imageUrl}
            width={18}
        />
    );
}

function inferStarFrameValueType(value: StarFrameValue): string {
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    if (isEnumEmptyVariant(value) || isEnumTupleVariant(value)) {
        return 'enum';
    }
    if (isRecord(value)) {
        return 'struct';
    }
    if (typeof value === 'bigint') {
        return 'bignum';
    }
    return typeof value;
}

function isRecord(value: StarFrameValue): value is Record<string, StarFrameValue> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isEnumEmptyVariant(value: StarFrameValue): value is { variant: string } {
    return isRecord(value) && typeof value.variant === 'string' && Object.keys(value).length === 1;
}

function isEnumTupleVariant(value: StarFrameValue): value is { variant: string; value: StarFrameValue } {
    return isRecord(value) && typeof value.variant === 'string' && 'value' in value;
}

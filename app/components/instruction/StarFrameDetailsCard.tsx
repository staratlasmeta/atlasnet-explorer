import { Address } from '@components/common/Address';
import { PublicKey, SignatureResult, TransactionInstruction } from '@solana/web3.js';
import { ExpandableRow } from '@utils/anchor';
import { camelToTitleCase } from '@utils/index';
import {
    decodeStarFrameInstruction,
    getStarFrameTypeLabel,
    StarFrameDecodedArgument,
    StarFrameValue,
    stringifyStarFrameValue,
} from '@utils/starframe';
import React, { ReactNode, useMemo } from 'react';
import { CornerDownRight } from 'react-feather';

import { InstructionCard } from './InstructionCard';

export default function StarFrameDetailsCard(props: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    signature: string;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix } = props;
    const decodedInstruction = useMemo(() => decodeStarFrameInstruction(ix), [ix]);
    const programName = decodedInstruction?.program.displayName ?? 'StarFrame';
    const instructionName = decodedInstruction?.instruction?.name ?? 'Unknown Instruction';
    const cardTitle = `${programName}: ${camelToTitleCase(instructionName)}`;

    return (
        <InstructionCard title={cardTitle} {...props}>
            <StarFrameDetails ix={ix} decodedInstruction={decodedInstruction} />
        </InstructionCard>
    );
}

function StarFrameDetails({
    ix,
    decodedInstruction,
}: {
    ix: TransactionInstruction;
    decodedInstruction: ReturnType<typeof decodeStarFrameInstruction>;
}) {
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
                            <Address pubkey={pubkey} alignRight link />
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

            {decodedInstruction.arguments.length > 0 && (
                <>
                    <tr className="table-sep">
                        <td>Argument Name</td>
                        <td>Type</td>
                        <td className="text-lg-end">Value</td>
                    </tr>
                    {decodedInstruction.arguments.map((argument, index) => (
                        <React.Fragment key={argument.name}>
                            {mapArgumentToRows(argument, `${index}`, 0)}
                        </React.Fragment>
                    ))}
                </>
            )}
        </>
    );
}

function mapArgumentToRows(argument: StarFrameDecodedArgument, key: string, nestingLevel: number) {
    return mapValueToRows(
        camelToTitleCase(argument.name),
        getStarFrameTypeLabel(argument.type),
        argument.value,
        key,
        nestingLevel
    );
}

function mapValueToRows(
    fieldName: string,
    fieldType: string,
    value: StarFrameValue,
    key: string,
    nestingLevel: number
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
                        nestingLevel + 1
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
                    nestingLevel + 1
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
                        nestingLevel + 1
                    )
                )}
            </ExpandableRow>
        );
    }

    return (
        <SimpleRow key={key} fieldName={fieldName} fieldType={fieldType} nestingLevel={nestingLevel}>
            {formatSimpleValue(value, fieldType)}
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

function formatSimpleValue(value: StarFrameValue, fieldType: string): ReactNode {
    if (typeof value === 'string' && fieldType === 'PublicKey') {
        return <Address pubkey={new PublicKey(value)} alignRight link />;
    }

    return stringifyStarFrameValue(value);
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

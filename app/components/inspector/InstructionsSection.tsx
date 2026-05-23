import { BaseInstructionCard } from '@components/common/BaseInstructionCard';
import { useCluster } from '@providers/cluster';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
    AddressLookupTableAccount,
    ComputeBudgetProgram,
    SignatureResult,
    TransactionInstruction,
    TransactionMessage,
    VersionedMessage,
} from '@solana/web3.js';
import { getStarFrameProgram } from '@utils/starframe';
import { getProgramName } from '@utils/tx';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { useAddressLookupTables } from '@/app/providers/accounts';
import { useAnchorProgram } from '@/app/providers/anchor';
import { FetchStatus } from '@/app/providers/cache';

import { ErrorCard } from '../common/ErrorCard';
import { LoadingCard } from '../common/LoadingCard';
import AnchorDetailsCard from '../instruction/AnchorDetailsCard';
import { ComputeBudgetDetailsCard } from '../instruction/ComputeBudgetDetailsCard';
import StarFrameDetailsCard from '../instruction/StarFrameDetailsCard';
import { AssociatedTokenDetailsCard } from './associated-token/AssociatedTokenDetailsCard';
import { intoParsedInstruction } from './into-parsed-data';
import { UnknownDetailsCard } from './UnknownDetailsCard';

export function InstructionsSection({ message }: { message: VersionedMessage }) {
    // Fetch all address lookup tables
    const hydratedTables = useAddressLookupTables(
        message.addressTableLookups.map(lookup => lookup.accountKey.toString())
    );
    for (let i = 0; i < hydratedTables.length; i++) {
        const table = hydratedTables[i];
        if (table && table[1] === FetchStatus.FetchFailed) {
            return (
                <ErrorCard
                    text={`Failed to fetch address lookup table: ${message.addressTableLookups[
                        i
                    ].accountKey.toString()}`}
                />
            );
        }
    }

    const allDefined = hydratedTables.every(
        table => table !== undefined && table[0] instanceof AddressLookupTableAccount
    );
    if (!allDefined) {
        return <LoadingCard />;
    }

    const addressLookupTableAccounts = (hydratedTables as any as Array<[AddressLookupTableAccount, FetchStatus]>).map(
        table => table[0]
    );
    const transactionMessage = TransactionMessage.decompile(message, { addressLookupTableAccounts });

    return (
        <>
            {transactionMessage.instructions.map((ix, index) => {
                return <InspectorInstructionCard key={index} {...{ index, ix, message }} />;
            })}
        </>
    );
}

function InspectorInstructionCard({
    message,
    ix,
    index,
}: {
    message: VersionedMessage;
    ix: TransactionInstruction;
    index: number;
}) {
    const { cluster, url } = useCluster();

    const programId = ix.programId;
    const programName = getProgramName(programId.toBase58(), cluster);
    const result = { err: null };
    const signature = '';

    /// Handle program-specific cards here
    //  - keep signature (empty string as we do not submit anything) for backward compatibility with the data from Transaction
    //  - result is err: null as at this point there should not be errors
    switch (ix.programId.toString()) {
        case ASSOCIATED_TOKEN_PROGRAM_ID.toString(): {
            // NOTE: current limitation is that innerInstructions won't be present at the AssociatedTokenDetailsCard. For that purpose we might need to simulateTransactions to get them.

            const asParsedInstruction = intoParsedInstruction(ix);
            return (
                <AssociatedTokenDetailsCard
                    key={index}
                    ix={asParsedInstruction}
                    raw={ix}
                    message={message}
                    index={index}
                    result={result}
                />
            );
        }
        case ComputeBudgetProgram.programId.toString(): {
            return (
                <ComputeBudgetDetailsCard
                    key={index}
                    ix={ix}
                    index={index}
                    result={result}
                    signature={signature}
                    InstructionCardComponent={BaseInstructionCard}
                />
            );
        }
        default: {
            // unknown program; allow to render the next card
        }
    }

    if (getStarFrameProgram(programId.toBase58())) {
        return (
            <ErrorBoundary
                fallback={<UnknownDetailsCard key={index} index={index} ix={ix} programName={programName} />}
            >
                <StarFrameDetailsCard index={index} ix={ix} result={result} signature={signature} />
            </ErrorBoundary>
        );
    }

    return (
        <InspectorAnchorOrUnknownDetailsCard
            index={index}
            ix={ix}
            programName={programName}
            result={result}
            signature={signature}
            url={url}
        />
    );
}

function InspectorAnchorOrUnknownDetailsCard({
    index,
    ix,
    programName,
    result,
    signature,
    url,
}: {
    index: number;
    ix: TransactionInstruction;
    programName: string;
    result: SignatureResult;
    signature: string;
    url: string;
}) {
    const anchorProgram = useAnchorProgram(ix.programId.toString(), url);

    if (anchorProgram.program) {
        return (
            <ErrorBoundary
                fallback={<UnknownDetailsCard key={index} index={index} ix={ix} programName={programName} />}
            >
                <AnchorDetailsCard
                    anchorProgram={anchorProgram.program}
                    index={index}
                    // Inner cards and child are not used since we do not know what CPIs
                    // will be called until simulation happens, and even then, all we
                    // get is logs, not the TransactionInstructions
                    innerCards={undefined}
                    ix={ix}
                    result={result}
                    signature={signature}
                />
            </ErrorBoundary>
        );
    }

    return <UnknownDetailsCard key={index} index={index} ix={ix} programName={programName} />;
}

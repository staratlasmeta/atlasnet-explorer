import { ParsedInstruction, PublicKey, TokenBalance, TransactionInstruction } from '@solana/web3.js';
import {
    buildSageCargoMovements,
    buildSageTokenAccountMovements,
    getSageTokenBalanceDeltas,
    SageCargoGameData,
} from '@utils/sage-cargo';
import {
    StarFrameDecodedArgument,
    StarFrameDecodedInstruction,
    StarFrameProgramDefinition,
    StarFrameValue,
} from '@utils/starframe';

const SAGE_PROGRAM_ID = new PublicKey('C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SOURCE_TOKEN_ACCOUNT = new PublicKey(new Uint8Array(32).fill(1));
const DESTINATION_TOKEN_ACCOUNT = new PublicKey(new Uint8Array(32).fill(2));
const CARGO_MINT = new PublicKey(new Uint8Array(32).fill(3));

const MOCK_PROGRAM = {
    accountByName: new Map(),
    accounts: [],
    definedTypes: new Map(),
    displayName: 'SAGE',
    idl: {
        kind: 'programNode',
        name: 'sageStarFrame',
        publicKey: 'C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF',
    },
    instructionByDiscriminator: new Map(),
    instructions: [],
    name: 'sageStarFrame',
    publicKey: 'C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF',
} as StarFrameProgramDefinition;

function makeGameData(data: Partial<SageCargoGameData> = {}): SageCargoGameData {
    return {
        cargoTypeByMint: new Map(),
        cargoTypes: new Map(),
        resources: {},
        ...data,
    };
}

function decodedInstruction(
    name: string,
    args: Record<string, StarFrameValue>,
    accountNames: string[] = []
): StarFrameDecodedInstruction {
    return {
        arguments: Object.entries(args).map(
            ([argumentName, value]) =>
                ({
                    name: argumentName,
                    type: { kind: 'testTypeNode' },
                    value,
                } as StarFrameDecodedArgument)
        ),
        instruction: {
            accounts: accountNames.map(accountName => ({
                isSigner: false,
                isWritable: true,
                kind: 'instructionAccountNode',
                name: accountName,
            })),
            kind: 'instructionNode',
            name,
        },
        program: MOCK_PROGRAM,
        status: 'decoded',
    };
}

describe('SAGE cargo movement summaries', () => {
    test('summarizes signed tank/bank and cargo hold transfers', () => {
        const gameData = makeGameData({
            resources: {
                ammo: 2,
                fuel: 1,
            },
        });

        const movements = buildSageCargoMovements(
            decodedInstruction('transferCargoToFleet', {
                ammoBank: -3n,
                cargoHold: {
                    toLoad: [[[7], 100n]],
                    toUnload: [[[8], 25n]],
                },
                fuelTank: 50n,
            }),
            gameData
        );

        expect(movements).toEqual([
            {
                amount: 50n,
                cargoId: 1,
                fallbackName: 'Fuel',
                route: 'Starbase -> Fleet Fuel Tank',
            },
            {
                amount: 3n,
                cargoId: 2,
                fallbackName: 'Ammo',
                route: 'Fleet Ammo Bank -> Starbase',
            },
            {
                amount: 100n,
                cargoId: 7,
                route: 'Starbase -> Fleet Cargo Hold',
            },
            {
                amount: 25n,
                cargoId: 8,
                route: 'Fleet Cargo Hold -> Starbase',
            },
        ]);
    });

    test('summarizes fleet-internal cargo pod transfers', () => {
        const movements = buildSageCargoMovements(
            decodedInstruction('transferCargoWithinFleet', {
                amount: 999n,
                cargoId: [4],
                cargoPodFrom: { variant: 'ammoBank' },
                cargoPodTo: { variant: 'cargoHold' },
            }),
            makeGameData()
        );

        expect(movements).toEqual([
            {
                amount: 999n,
                cargoId: 4,
                route: 'Fleet Ammo Bank -> Fleet Cargo Hold',
            },
        ]);
    });

    test('summarizes loot request cargo bundles', () => {
        const movements = buildSageCargoMovements(
            decodedInstruction('retrieveLoot', {
                want: [
                    [
                        2,
                        [
                            [[7], 100n],
                            [[8], 50n],
                        ],
                    ],
                ],
            }),
            makeGameData()
        );

        expect(movements).toEqual([
            {
                amount: 100n,
                cargoId: 7,
                route: 'Loot #2 -> Fleet',
            },
            {
                amount: 50n,
                cargoId: 8,
                route: 'Loot #2 -> Fleet',
            },
        ]);
    });

    test('summarizes inner token account transfers with instruction account labels', () => {
        const movements = buildSageTokenAccountMovements({
            decodedInstruction: decodedInstruction('depositCargoToGame', {}, ['source', 'destination']),
            innerInstructions: [
                {
                    parsed: {
                        info: {
                            destination: DESTINATION_TOKEN_ACCOUNT.toBase58(),
                            mint: CARGO_MINT.toBase58(),
                            source: SOURCE_TOKEN_ACCOUNT.toBase58(),
                            tokenAmount: {
                                amount: '1250',
                                decimals: 0,
                                uiAmountString: '1250',
                            },
                        },
                        type: 'transferChecked',
                    },
                    program: 'spl-token',
                    programId: TOKEN_PROGRAM_ID,
                } as ParsedInstruction,
            ],
            ix: makeTransactionInstruction([SOURCE_TOKEN_ACCOUNT, DESTINATION_TOKEN_ACCOUNT]),
        });

        expect(movements).toEqual([
            {
                amount: 1250n,
                decimals: 0,
                destination: DESTINATION_TOKEN_ACCOUNT.toBase58(),
                mint: CARGO_MINT.toBase58(),
                route: 'Source -> Destination',
                source: SOURCE_TOKEN_ACCOUNT.toBase58(),
            },
        ]);
    });

    test('summarizes token balance state deltas when there is no parsed transfer', () => {
        const tokenBalanceDeltas = getSageTokenBalanceDeltas(
            [mockTokenBalance(0, CARGO_MINT, '2500', 0)],
            [mockTokenBalance(0, CARGO_MINT, '1000', 0)],
            [{ pubkey: SOURCE_TOKEN_ACCOUNT, signer: false, writable: true }]
        );

        const movements = buildSageTokenAccountMovements({
            decodedInstruction: decodedInstruction('withdrawCargoFromGame', {}, ['source']),
            ix: makeTransactionInstruction([SOURCE_TOKEN_ACCOUNT]),
            tokenBalanceDeltas,
        });

        expect(movements).toEqual([
            {
                amount: 1500n,
                decimals: 0,
                mint: CARGO_MINT.toBase58(),
                route: 'Source Balance Decrease',
            },
        ]);
    });
});

function makeTransactionInstruction(keys: PublicKey[]): TransactionInstruction {
    return new TransactionInstruction({
        data: Buffer.alloc(0),
        keys: keys.map(pubkey => ({ isSigner: false, isWritable: true, pubkey })),
        programId: SAGE_PROGRAM_ID,
    });
}

function mockTokenBalance(accountIndex: number, mint: PublicKey, amount: string, decimals: number): TokenBalance {
    return {
        accountIndex,
        mint: mint.toBase58(),
        uiTokenAmount: {
            amount,
            decimals,
            uiAmount: null,
            uiAmountString: amount,
        },
    };
}

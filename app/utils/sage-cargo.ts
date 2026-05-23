import type {
    ParsedInstruction,
    ParsedMessageAccount,
    PartiallyDecodedInstruction,
    TokenBalance,
} from '@solana/web3.js';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';

import { decodeStarFrameAccount, StarFrameDecodedInstruction, StarFrameValue } from './starframe';

export type SageCargoType = {
    id: number;
    mint?: string;
    name?: string;
};

export type SageCargoGameData = {
    cargoTypeByMint: Map<string, SageCargoType>;
    cargoTypes: Map<number, SageCargoType>;
    resources: Partial<Record<'ammo' | 'food' | 'fuel' | 'repairKit', number>>;
};

export type SageCargoMovement = {
    amount: bigint;
    cargoId?: number;
    decimals?: number;
    fallbackName?: string;
    mint?: string;
    route: string;
};

export type SageTokenBalanceDelta = {
    account: string;
    accountIndex: number;
    amount: bigint;
    decimals: number;
    mint: string;
};

export type SageTokenMovementContext = {
    decodedInstruction: StarFrameDecodedInstruction;
    innerInstructions?: (ParsedInstruction | PartiallyDecodedInstruction)[];
    ix: TransactionInstruction;
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>;
};

const EMPTY_CARGO_GAME_DATA: SageCargoGameData = {
    cargoTypeByMint: new Map(),
    cargoTypes: new Map(),
    resources: {},
};

const TOKEN_PROGRAM_NAMES = new Set(['spl-token', 'spl-token-2022']);
const cachedCargoDataPromises = new Map<string, Promise<SageCargoGameData>>();

export async function getSageCargoTypes(gameAddress: string, rpcUrl: string): Promise<Map<number, SageCargoType>> {
    return (await getSageCargoGameData(gameAddress, rpcUrl)).cargoTypes;
}

export async function getSageCargoGameData(gameAddress: string, rpcUrl: string): Promise<SageCargoGameData> {
    const key = `${rpcUrl}:${gameAddress}`;
    const cached = cachedCargoDataPromises.get(key);
    if (cached) {
        return cached;
    }

    const promise = fetchSageCargoGameData(gameAddress, rpcUrl);
    cachedCargoDataPromises.set(key, promise);
    return promise;
}

export function buildSageCargoMovements(
    decodedInstruction: StarFrameDecodedInstruction,
    gameData: SageCargoGameData
): SageCargoMovement[] {
    const args = Object.fromEntries(decodedInstruction.arguments.map(argument => [argument.name, argument.value]));

    switch (decodedInstruction.instruction?.name) {
        case 'transferCargoToFleet':
            return [
                ...signedMovement(
                    args.fuelTank,
                    gameData.resources.fuel,
                    'Fuel',
                    'Starbase -> Fleet Fuel Tank',
                    'Fleet Fuel Tank -> Starbase'
                ),
                ...signedMovement(
                    args.ammoBank,
                    gameData.resources.ammo,
                    'Ammo',
                    'Starbase -> Fleet Ammo Bank',
                    'Fleet Ammo Bank -> Starbase'
                ),
                ...cargoPairMovements(
                    isRecord(args.cargoHold) ? args.cargoHold.toLoad : undefined,
                    'Starbase -> Fleet Cargo Hold'
                ),
                ...cargoPairMovements(
                    isRecord(args.cargoHold) ? args.cargoHold.toUnload : undefined,
                    'Fleet Cargo Hold -> Starbase'
                ),
            ];
        case 'transferCargoWithinFleet': {
            const cargoId = getCargoId(args.cargoId);
            const amount = getAmount(args.amount);
            if (cargoId === undefined || amount === undefined || amount === 0n) {
                return [];
            }

            return [
                {
                    amount,
                    cargoId,
                    route: `${formatCargoPod(args.cargoPodFrom)} -> ${formatCargoPod(args.cargoPodTo)}`,
                },
            ];
        }
        case 'startClaimStakesFleetTransfer':
            return [
                ...cargoPairMovements(args.toLoad, 'Claim Stake -> Fleet'),
                ...cargoPairMovements(args.toUnload, 'Fleet -> Claim Stake'),
            ];
        case 'craftingHabResourceSwap':
            return [
                ...cargoPairMovements(args.toLoad, 'Starbase -> Crafting Hab'),
                ...cargoPairMovements(args.toUnload, 'Crafting Hab -> Starbase'),
            ];
        case 'retrieveLoot':
            return lootMovements(args.want);
        case 'contributeToStarbaseUpgrade': {
            const cargoId = getCargoId(args.resourceId);
            const amount = getAmount(args.quantity);
            if (cargoId === undefined || amount === undefined || amount === 0n) {
                return [];
            }

            return [{ amount, cargoId, route: 'Starbase -> Upgrade' }];
        }
        default:
            return [];
    }
}

export function buildSageTokenAccountMovements({
    decodedInstruction,
    innerInstructions = [],
    ix,
    tokenBalanceDeltas,
}: SageTokenMovementContext): SageCargoMovement[] {
    if (decodedInstruction.program.name !== 'sageStarFrame') {
        return [];
    }

    const accountLabels = getInstructionAccountLabels(ix, decodedInstruction);
    const touchedTokenAccounts = new Set<string>();
    const coveredDeltaKeys = new Set<string>();

    const tokenTransferMovements = innerInstructions.flatMap(innerInstruction => {
        const movement = parseTokenInstructionMovement(innerInstruction, accountLabels, tokenBalanceDeltas);
        if (!movement) {
            return [];
        }

        if (movement.source) {
            touchedTokenAccounts.add(movement.source);
            if (movement.mint) {
                coveredDeltaKeys.add(getTokenBalanceDeltaKey(movement.source, movement.mint));
            }
        }
        if (movement.destination) {
            touchedTokenAccounts.add(movement.destination);
            if (movement.mint) {
                coveredDeltaKeys.add(getTokenBalanceDeltaKey(movement.destination, movement.mint));
            }
        }

        return [movement];
    });

    for (const key of ix.keys) {
        touchedTokenAccounts.add(key.pubkey.toBase58());
    }

    const deltaMovements = [...(tokenBalanceDeltas?.values() ?? [])]
        .flat()
        .filter(delta => {
            if (!touchedTokenAccounts.has(delta.account)) {
                return false;
            }
            return !coveredDeltaKeys.has(getTokenBalanceDeltaKey(delta.account, delta.mint));
        })
        .map(delta => {
            const amount = delta.amount < 0n ? -delta.amount : delta.amount;
            const label = formatAccountLabel(delta.account, accountLabels);
            return {
                amount,
                decimals: delta.decimals,
                mint: delta.mint,
                route: `${label} Balance ${delta.amount < 0n ? 'Decrease' : 'Increase'}`,
            };
        });

    return [...tokenTransferMovements, ...deltaMovements];
}

export function getSageTokenBalanceDeltas(
    preTokenBalances: TokenBalance[] | null | undefined,
    postTokenBalances: TokenBalance[] | null | undefined,
    accounts: ParsedMessageAccount[] | undefined
): Map<string, SageTokenBalanceDelta[]> {
    const deltasByAccount = new Map<string, SageTokenBalanceDelta[]>();

    if (!accounts || (!preTokenBalances && !postTokenBalances)) {
        return deltasByAccount;
    }

    const preBalanceMap = new Map<number, TokenBalance>();
    const postBalanceMap = new Map<number, TokenBalance>();

    preTokenBalances?.forEach(balance => preBalanceMap.set(balance.accountIndex, balance));
    postTokenBalances?.forEach(balance => postBalanceMap.set(balance.accountIndex, balance));

    const accountIndexes = new Set([...preBalanceMap.keys(), ...postBalanceMap.keys()]);

    for (const accountIndex of accountIndexes) {
        const account = accounts[accountIndex]?.pubkey.toBase58();
        if (!account) {
            continue;
        }

        const preBalance = preBalanceMap.get(accountIndex);
        const postBalance = postBalanceMap.get(accountIndex);

        if (preBalance && postBalance && preBalance.mint !== postBalance.mint) {
            addTokenBalanceDelta(deltasByAccount, {
                account,
                accountIndex,
                amount: -parseTokenAmount(preBalance.uiTokenAmount.amount),
                decimals: preBalance.uiTokenAmount.decimals,
                mint: preBalance.mint,
            });
            addTokenBalanceDelta(deltasByAccount, {
                account,
                accountIndex,
                amount: parseTokenAmount(postBalance.uiTokenAmount.amount),
                decimals: postBalance.uiTokenAmount.decimals,
                mint: postBalance.mint,
            });
            continue;
        }

        const balance = postBalance ?? preBalance;
        if (!balance) {
            continue;
        }

        const amount =
            parseTokenAmount(postBalance?.uiTokenAmount.amount ?? '0') -
            parseTokenAmount(preBalance?.uiTokenAmount.amount ?? '0');
        if (amount === 0n) {
            continue;
        }

        addTokenBalanceDelta(deltasByAccount, {
            account,
            accountIndex,
            amount,
            decimals: balance.uiTokenAmount.decimals,
            mint: balance.mint,
        });
    }

    return deltasByAccount;
}

async function fetchSageCargoGameData(gameAddress: string, rpcUrl: string): Promise<SageCargoGameData> {
    try {
        const accountInfo = await new Connection(rpcUrl).getAccountInfo(new PublicKey(gameAddress));
        if (!accountInfo) {
            return EMPTY_CARGO_GAME_DATA;
        }

        const decodedGame = decodeStarFrameAccount('sageStarFrame', 'game', accountInfo.data);
        if (!decodedGame || decodedGame.status !== 'decoded') {
            return EMPTY_CARGO_GAME_DATA;
        }

        return extractCargoGameData(decodedGame.data);
    } catch (error) {
        console.error('Failed to fetch SAGE cargo definitions:', error);
        return EMPTY_CARGO_GAME_DATA;
    }
}

function extractCargoGameData(gameData: StarFrameValue): SageCargoGameData {
    const cargoTypes = new Map<number, SageCargoType>();
    const cargoTypeByMint = new Map<string, SageCargoType>();
    const resources: SageCargoGameData['resources'] = {};
    const resourceData = isRecord(gameData) ? gameData.resources : undefined;
    const cargoDefinitions = isRecord(gameData) ? gameData.cargoDefinitions : undefined;
    const cargoTypeEntries = isRecord(cargoDefinitions) ? cargoDefinitions.cargoTypes : undefined;

    if (isRecord(resourceData)) {
        resources.ammo = getCargoId(resourceData.ammo);
        resources.food = getCargoId(resourceData.food);
        resources.fuel = getCargoId(resourceData.fuel);
        resources.repairKit = getCargoId(resourceData.repairKit);
    }

    if (!Array.isArray(cargoTypeEntries)) {
        return { cargoTypeByMint, cargoTypes, resources };
    }

    for (const entry of cargoTypeEntries) {
        if (!isRecord(entry) || !isRecord(entry.value)) {
            continue;
        }

        const id = getCargoId(entry.key ?? entry.value.id);
        if (id === undefined) {
            continue;
        }

        const cargoType = {
            id,
            mint: typeof entry.value.mint === 'string' ? entry.value.mint : undefined,
            name: decodeName(entry.value.name),
        };

        cargoTypes.set(id, cargoType);
        if (cargoType.mint) {
            cargoTypeByMint.set(cargoType.mint, cargoType);
        }
    }

    return { cargoTypeByMint, cargoTypes, resources };
}

function parseTokenInstructionMovement(
    instruction: ParsedInstruction | PartiallyDecodedInstruction,
    accountLabels: Map<string, string>,
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>
): (SageCargoMovement & { destination?: string; source?: string }) | undefined {
    if (!isParsedTokenInstruction(instruction)) {
        return undefined;
    }

    const { info, type } = instruction.parsed;
    if (!isRecord(info) || typeof type !== 'string') {
        return undefined;
    }

    switch (type) {
        case 'transfer':
        case 'transferChecked':
        case 'transfer2': {
            const source = getPublicKeyString(info.source);
            const destination = getPublicKeyString(info.destination);
            const transferAmount = getTokenInstructionAmount(info);
            if (!source || !destination || !transferAmount) {
                return undefined;
            }

            const mint = transferAmount.mint ?? getDeltaMint(source, destination, tokenBalanceDeltas);
            const decimals = transferAmount.decimals ?? getDeltaDecimals(source, destination, mint, tokenBalanceDeltas);

            return {
                amount: transferAmount.amount,
                decimals,
                destination,
                mint,
                route: `${formatAccountLabel(source, accountLabels)} -> ${formatAccountLabel(
                    destination,
                    accountLabels
                )}`,
                source,
            };
        }
        case 'mintTo':
        case 'mintToChecked':
        case 'mintTo2': {
            const destination = getPublicKeyString(info.account);
            const transferAmount = getTokenInstructionAmount(info);
            const mint = transferAmount?.mint ?? getPublicKeyString(info.mint);
            if (!destination || !transferAmount) {
                return undefined;
            }

            return {
                amount: transferAmount.amount,
                decimals: transferAmount.decimals,
                destination,
                mint,
                route: `Mint -> ${formatAccountLabel(destination, accountLabels)}`,
            };
        }
        case 'burn':
        case 'burnChecked':
        case 'burn2': {
            const source = getPublicKeyString(info.account);
            const transferAmount = getTokenInstructionAmount(info);
            const mint = transferAmount?.mint ?? getPublicKeyString(info.mint);
            if (!source || !transferAmount) {
                return undefined;
            }

            return {
                amount: transferAmount.amount,
                decimals: transferAmount.decimals,
                mint,
                route: `${formatAccountLabel(source, accountLabels)} -> Burn`,
                source,
            };
        }
        default:
            return undefined;
    }
}

function getInstructionAccountLabels(
    ix: TransactionInstruction,
    decodedInstruction: StarFrameDecodedInstruction
): Map<string, string> {
    const labels = new Map<string, string>();
    const accounts = decodedInstruction.instruction?.accounts ?? [];
    const omittedOptionalAccounts = Math.max(accounts.length - ix.keys.length, 0);
    let omittedOptionalAccountCount = 0;
    let keyIndex = 0;

    for (const account of accounts) {
        if (account.isOptional && omittedOptionalAccountCount < omittedOptionalAccounts) {
            omittedOptionalAccountCount++;
            continue;
        }

        const key = ix.keys[keyIndex];
        if (!key) {
            continue;
        }

        labels.set(key.pubkey.toBase58(), titleCaseCamel(account.name));
        keyIndex++;
    }

    return labels;
}

function getTokenInstructionAmount(
    info: Record<string, StarFrameValue>
): { amount: bigint; decimals?: number; mint?: string } | undefined {
    if (isRecord(info.tokenAmount)) {
        const amount = getAmount(info.tokenAmount.amount);
        if (amount === undefined || amount === 0n) {
            return undefined;
        }

        return {
            amount,
            decimals: typeof info.tokenAmount.decimals === 'number' ? info.tokenAmount.decimals : undefined,
            mint: getPublicKeyString(info.mint),
        };
    }

    const amount = getAmount(info.amount);
    if (amount === undefined || amount === 0n) {
        return undefined;
    }

    return {
        amount,
        mint: getPublicKeyString(info.mint),
    };
}

function getDeltaMint(
    source: string,
    destination: string,
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>
): string | undefined {
    return tokenBalanceDeltas?.get(source)?.[0]?.mint ?? tokenBalanceDeltas?.get(destination)?.[0]?.mint;
}

function getDeltaDecimals(
    source: string,
    destination: string,
    mint: string | undefined,
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>
): number | undefined {
    return (
        findTokenBalanceDelta(source, mint, tokenBalanceDeltas)?.decimals ??
        findTokenBalanceDelta(destination, mint, tokenBalanceDeltas)?.decimals
    );
}

function findTokenBalanceDelta(
    account: string,
    mint: string | undefined,
    tokenBalanceDeltas?: Map<string, SageTokenBalanceDelta[]>
): SageTokenBalanceDelta | undefined {
    const deltas = tokenBalanceDeltas?.get(account);
    if (!deltas) {
        return undefined;
    }

    return mint ? deltas.find(delta => delta.mint === mint) : deltas[0];
}

function addTokenBalanceDelta(deltasByAccount: Map<string, SageTokenBalanceDelta[]>, delta: SageTokenBalanceDelta) {
    if (delta.amount === 0n) {
        return;
    }

    const existingDeltas = deltasByAccount.get(delta.account) ?? [];
    existingDeltas.push(delta);
    deltasByAccount.set(delta.account, existingDeltas);
}

function signedMovement(
    value: StarFrameValue | undefined,
    cargoId: number | undefined,
    fallbackName: string,
    positiveRoute: string,
    negativeRoute: string
): SageCargoMovement[] {
    const amount = getAmount(value);
    if (amount === undefined || amount === 0n) {
        return [];
    }

    return [
        {
            amount: amount < 0n ? -amount : amount,
            cargoId,
            fallbackName,
            route: amount < 0n ? negativeRoute : positiveRoute,
        },
    ];
}

function cargoPairMovements(value: StarFrameValue | undefined, route: string): SageCargoMovement[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap(item => {
        if (!Array.isArray(item) || item.length < 2) {
            return [];
        }

        const cargoId = getCargoId(item[0]);
        const amount = getAmount(item[1]);
        if (cargoId === undefined || amount === undefined || amount === 0n) {
            return [];
        }

        return [{ amount, cargoId, route }];
    });
}

function lootMovements(value: StarFrameValue | undefined): SageCargoMovement[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.flatMap(item => {
        if (!Array.isArray(item) || item.length < 2) {
            return [];
        }

        const lootIndex = getCargoId(item[0]);
        const route = lootIndex === undefined ? 'Loot -> Fleet' : `Loot #${lootIndex} -> Fleet`;
        return cargoPairMovements(item[1], route);
    });
}

export function getCargoId(value: StarFrameValue | undefined): number | undefined {
    if (typeof value === 'number' && Number.isSafeInteger(value)) {
        return value;
    }

    if (typeof value === 'bigint') {
        const numberValue = Number(value);
        return Number.isSafeInteger(numberValue) ? numberValue : undefined;
    }

    if (Array.isArray(value) && value.length === 1) {
        return getCargoId(value[0]);
    }

    return undefined;
}

function getAmount(value: StarFrameValue | undefined): bigint | undefined {
    if (typeof value === 'bigint') {
        return value;
    }

    if (typeof value === 'number' && Number.isSafeInteger(value)) {
        return BigInt(value);
    }

    if (typeof value === 'string' && /^\d+$/.test(value)) {
        return BigInt(value);
    }

    return undefined;
}

function parseTokenAmount(value: string): bigint {
    return /^\d+$/.test(value) ? BigInt(value) : 0n;
}

function formatCargoPod(value: StarFrameValue | undefined): string {
    if (isRecord(value) && typeof value.variant === 'string') {
        switch (value.variant) {
            case 'ammoBank':
                return 'Fleet Ammo Bank';
            case 'cargoHold':
                return 'Fleet Cargo Hold';
            case 'fuelTank':
                return 'Fleet Fuel Tank';
            default:
                return value.variant;
        }
    }

    return 'Fleet Cargo Pod';
}

function formatAccountLabel(address: string, accountLabels: Map<string, string>): string {
    return accountLabels.get(address) ?? shortenAddress(address);
}

function shortenAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function titleCaseCamel(value: string): string {
    return value
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, firstLetter => firstLetter.toUpperCase())
        .trim();
}

function decodeName(value: StarFrameValue | undefined): string | undefined {
    const bytes = Array.isArray(value) && Array.isArray(value[0]) ? value[0] : undefined;
    if (!bytes) {
        return undefined;
    }

    const chars = bytes
        .filter((byte): byte is number => typeof byte === 'number' && byte !== 0)
        .map(byte => String.fromCharCode(byte));
    const name = chars.join('').trim();
    return name || undefined;
}

function getPublicKeyString(value: StarFrameValue | undefined): string | undefined {
    if (typeof value === 'string') {
        return value;
    }

    if (value instanceof PublicKey) {
        return value.toBase58();
    }

    return undefined;
}

function getTokenBalanceDeltaKey(account: string, mint: string): string {
    return `${account}:${mint}`;
}

function isParsedTokenInstruction(
    instruction: ParsedInstruction | PartiallyDecodedInstruction
): instruction is ParsedInstruction & { parsed: { info: StarFrameValue; type: string } } {
    return (
        'parsed' in instruction &&
        TOKEN_PROGRAM_NAMES.has(instruction.program) &&
        typeof instruction.parsed === 'object' &&
        instruction.parsed !== null
    );
}

function isRecord(value: StarFrameValue | undefined): value is Record<string, StarFrameValue> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

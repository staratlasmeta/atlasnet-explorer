import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { decodeStarFrameInstruction } from '@utils/starframe';

import sdkFixtures from './fixtures/starframe-main-70cb8d69.json';

const SAGE_PROGRAM_ID = 'C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF';
const HYE_PROGRAM_ID = 'HYEWZXXzMyrnN89ASYPVHHdFdgvrgV8diFLv6P2wEwFN';

function instruction(data: string, accountCount: number, programId = SAGE_PROGRAM_ID) {
    return new TransactionInstruction({
        data: Buffer.from(data, 'hex'),
        keys: Array.from({ length: accountCount }, (_value, index) => ({
            isSigner: index === 0,
            isWritable: true,
            pubkey: new PublicKey(new Uint8Array(32).fill(index + 1)),
        })),
        programId: new PublicKey(programId),
    });
}

function expectedArguments(value: unknown) {
    return JSON.parse(JSON.stringify(value), (_key, item) =>
        item && typeof item === 'object' && '$bigint' in item ? BigInt(item.$bigint) : item
    );
}

describe('Programs main 70cb8d69 compatibility', () => {
    // These bytes and expected values come from the pinned generated Programs SDK,
    // not from Explorer's decoder or a test-local mirror of it.
    test.each(sdkFixtures.vectors)('decodes current SDK arguments and account order: $name', fixture => {
        const decoded = decodeStarFrameInstruction(instruction(fixture.data, fixture.accounts.length));

        expect(decoded?.status).toBe('decoded');
        expect(decoded?.instruction?.name).toBe(fixture.name);
        expect(decoded?.instruction?.accounts?.map(account => account.name)).toEqual(fixture.accounts);
        expect(decoded?.layoutWarning).toBeUndefined();
        expect(Object.fromEntries(decoded?.arguments.map(argument => [argument.name, argument.value]) ?? [])).toEqual(
            expectedArguments(fixture.expected)
        );
    });

    test.each(sdkFixtures.vectors.filter(fixture => fixture.legacyAccounts))(
        'preserves the intermediate 181e8ad6 account layout: $name',
        fixture => {
            const decoded = decodeStarFrameInstruction(instruction(fixture.data, fixture.legacyAccounts!.length));

            expect(decoded?.status).toBe('decoded');
            expect(decoded?.instruction?.accounts?.map(account => account.name)).toEqual(fixture.legacyAccounts);
            expect(decoded?.layoutWarning).toContain('previous instruction layout');
            expect(
                Object.fromEntries(decoded?.arguments.map(argument => [argument.name, argument.value]) ?? [])
            ).toEqual(expectedArguments(fixture.expected));
        }
    );

    test.each([
        'detectSignal',
        'resolveSignal',
        'abandonSignal',
        'updateXpBudgetConfig',
        'requestDemocracyPtrAllocation',
    ])('decodes %s under the HYE instance identity', name => {
        const fixture = sdkFixtures.vectors.find(vector => vector.name === name)!;
        const decoded = decodeStarFrameInstruction(instruction(fixture.data, fixture.accounts.length, HYE_PROGRAM_ID));

        expect(decoded?.status).toBe('decoded');
        expect(decoded?.instruction?.name).toBe(name);
        expect(decoded?.layoutWarning).toBeUndefined();
    });

    test.each(['detectSignal', 'updateXpBudgetConfig', 'requestDemocracyPtrAllocation'])(
        'rejects truncated or overlong %s payloads',
        name => {
            const fixture = sdkFixtures.vectors.find(vector => vector.name === name)!;
            for (const data of [fixture.data.slice(0, -2), fixture.data + '00']) {
                const decoded = decodeStarFrameInstruction(instruction(data, fixture.accounts.length));
                expect(decoded?.status).toBe('error');
            }
        }
    );

    test('does not guess an unknown crafting layout between the preserved generations', () => {
        // CompleteCraftingProcess has known 12-, 13- and 19-account layouts.
        const fixture = sdkFixtures.vectors.find(vector => vector.name === 'completeCraftingProcess')!;
        const decoded = decodeStarFrameInstruction(instruction(fixture.data, 14));

        expect(decoded?.status).toBe('error');
        expect(decoded?.instruction?.accounts).toEqual([]);
        expect(decoded?.arguments).toEqual([]);
    });
});

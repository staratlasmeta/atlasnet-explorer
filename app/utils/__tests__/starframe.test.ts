import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { decodeStarFrameInstruction } from '@utils/starframe';

import sdkFixtures from './fixtures/starframe-main-181e8ad6.json';

const SAGE_PROGRAM_ID = new PublicKey('C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF');
const PROFILE_FACTION_PROGRAM_ID = new PublicKey('C4FACQA1PpNRKrjQ2862ABNR42DTz7EzGj1uhTNFASwP');

function makeInstruction({
    accountCount = 0,
    data,
    programId,
}: {
    accountCount?: number;
    data: string;
    programId: PublicKey;
}) {
    return new TransactionInstruction({
        data: Buffer.from(data, 'hex'),
        keys: Array.from({ length: accountCount }, (_value, index) => ({
            isSigner: index === 0,
            isWritable: index === 1,
            pubkey: new PublicKey(new Uint8Array(32).fill(index + 1)),
        })),
        programId,
    });
}

describe('StarFrame instruction decoder', () => {
    // Frozen bytes come from programs' generated SDK, not an encoder implemented
    // by this test or by Explorer. Include nonzero values and integers above 2^53.
    test.each(sdkFixtures.vectors)('decodes current SDK payload and account order: $name', fixture => {
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                accountCount: fixture.accounts.length,
                data: fixture.data,
                programId: SAGE_PROGRAM_ID,
            })
        );

        expect(decoded?.status).toBe('decoded');
        expect(decoded?.instruction?.name).toBe(fixture.name);
        expect(decoded?.instruction?.accounts?.map(account => account.name)).toEqual(fixture.accounts);
        expect(decoded?.layoutWarning).toBeUndefined();
        const expected = JSON.parse(JSON.stringify(fixture.expected), (_key, value) =>
            value && typeof value === 'object' && '$bigint' in value ? BigInt(value.$bigint) : value
        );
        expect(Object.fromEntries(decoded?.arguments.map(argument => [argument.name, argument.value]) ?? [])).toEqual(
            expected
        );
    });

    test.each(sdkFixtures.vectors.filter(fixture => fixture.legacyAccounts))(
        'preserves the known previous account layout: $name',
        fixture => {
            const isAdmin = fixture.name === 'adminCreateFleet' || fixture.name === 'adminDepositCargoToFleet';
            const decoded = decodeStarFrameInstruction(
                makeInstruction({
                    accountCount: fixture.legacyAccounts?.length,
                    data: isAdmin ? fixture.data.slice(0, -4) : fixture.data,
                    programId: SAGE_PROGRAM_ID,
                })
            );

            expect(decoded?.status).toBe('decoded');
            expect(decoded?.instruction?.accounts?.map(account => account.name)).toEqual(fixture.legacyAccounts);
            expect(decoded?.layoutWarning).toContain('previous instruction layout');
            expect(decoded?.arguments.some(argument => argument.name === 'gameAdminKeyIndex')).toBe(false);
        }
    );

    test.each(['adminCreateFleet', 'adminDepositCargoToFleet'])(
        'does not reinterpret truncated current %s arguments as legacy',
        name => {
            const fixture = sdkFixtures.vectors.find(vector => vector.name === name)!;
            const decoded = decodeStarFrameInstruction(
                makeInstruction({
                    accountCount: fixture.accounts.length,
                    data: fixture.data.slice(0, -4),
                    programId: SAGE_PROGRAM_ID,
                })
            );

            expect(decoded?.status).toBe('error');
            expect(decoded?.layoutWarning).toBeUndefined();
        }
    );

    test('does not guess account names for an unrecognized historical layout', () => {
        const fixture = sdkFixtures.vectors.find(vector => vector.name === 'adminCreateFleet')!;
        const decoded = decodeStarFrameInstruction(
            makeInstruction({ accountCount: 9, data: fixture.data, programId: SAGE_PROGRAM_ID })
        );

        expect(decoded?.status).toBe('error');
        expect(decoded?.instruction?.accounts).toEqual([]);
        expect(decoded?.arguments).toEqual([]);
    });

    test.each(['00', ''])('requires a complete payload for the previous admin layout (%s)', suffix => {
        const fixture = sdkFixtures.vectors.find(vector => vector.name === 'adminDepositCargoToFleet')!;
        const data = suffix ? fixture.data.slice(0, -4) + suffix : fixture.data.slice(0, -6);
        const decoded = decodeStarFrameInstruction(
            makeInstruction({ accountCount: fixture.legacyAccounts?.length, data, programId: SAGE_PROGRAM_ID })
        );

        expect(decoded?.status).toBe('error');
        expect(decoded?.instruction?.accounts).toEqual([]);
        expect(decoded?.arguments).toEqual([]);
        expect(decoded?.layoutWarning).toBeUndefined();
    });

    test('recognizes the parallel SAGE program identity from programs main', () => {
        const fixture = sdkFixtures.vectors.find(vector => vector.name === 'submitEpochVote')!;
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                accountCount: fixture.accounts.length,
                data: fixture.data,
                programId: new PublicKey('4LSpiEtN5EwXkL79KbrtwZj4C4TnEWEjaPDTDCDQG7M1'),
            })
        );

        expect(decoded?.status).toBe('decoded');
        expect(decoded?.instruction?.name).toBe('submitEpochVote');
    });

    test('decodes StarFrame instruction arguments from bundled Codama IDLs', () => {
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                accountCount: 7,
                data: '626fc6ce465443622a00010115cd5b0700000000',
                programId: SAGE_PROGRAM_ID,
            })
        );

        expect(decoded?.status).toBe('decoded');
        if (!decoded || decoded.status !== 'decoded') {
            throw new Error(decoded?.error ?? 'Expected decoded StarFrame instruction');
        }

        const args = Object.fromEntries(decoded.arguments.map(argument => [argument.name, argument.value]));
        expect(decoded.program.displayName).toBe('SAGE');
        expect(decoded.instruction.name).toBe('dailyCheckIn');
        expect(args.keyIndex).toBe(42);
        expect(args.restoreStreak).toBe(true);
        expect(args.expectedRestoreCost).toBe(123456789n);
    });

    test('decodes no-argument StarFrame instructions', () => {
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                accountCount: 5,
                data: 'bf1242f83f4c7cd5',
                programId: SAGE_PROGRAM_ID,
            })
        );

        expect(decoded?.status).toBe('decoded');
        if (!decoded || decoded.status !== 'decoded') {
            throw new Error(decoded?.error ?? 'Expected decoded StarFrame instruction');
        }

        expect(decoded.instruction.name).toBe('registerCharacter');
        expect(decoded.arguments).toHaveLength(0);
    });

    test('decodes enum arguments', () => {
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                accountCount: 7,
                data: 'b2e844d95970caaf070002',
                programId: PROFILE_FACTION_PROGRAM_ID,
            })
        );

        expect(decoded?.status).toBe('decoded');
        if (!decoded || decoded.status !== 'decoded') {
            throw new Error(decoded?.error ?? 'Expected decoded StarFrame instruction');
        }

        const args = Object.fromEntries(decoded.arguments.map(argument => [argument.name, argument.value]));
        expect(decoded.instruction.name).toBe('chooseFaction');
        expect(args.keyIndex).toBe(7);
        expect(args.faction).toEqual({ variant: 'oni' });
    });

    test('reports trailing bytes instead of silently half-decoding', () => {
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                accountCount: 7,
                data: '626fc6ce465443622a00010115cd5b070000000000',
                programId: SAGE_PROGRAM_ID,
            })
        );

        expect(decoded?.status).toBe('error');
        if (!decoded || decoded.status !== 'error') {
            throw new Error('Expected trailing bytes to return a decode error');
        }
        expect(decoded.error).toContain('unread byte');
    });

    test('ignores programs outside the bundled StarFrame registry', () => {
        const decoded = decodeStarFrameInstruction(
            makeInstruction({
                data: '626fc6ce46544362',
                programId: new PublicKey(new Uint8Array(32).fill(9)),
            })
        );

        expect(decoded).toBeNull();
    });
});

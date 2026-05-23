import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { decodeStarFrameInstruction } from '@utils/starframe';

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

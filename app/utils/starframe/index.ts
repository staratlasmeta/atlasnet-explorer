import { PublicKey, TransactionInstruction } from '@solana/web3.js';

import playerProfileIdl from './idls/player-profile.json';
import profileFactionIdl from './idls/profile-faction.json';
import profileSubscriptionIdl from './idls/profile-subscription.json';
import sageIdl from './idls/sage.json';

type CodamaNode = {
    kind: string;
    [key: string]: any;
};

type StarFrameIdl = {
    kind: 'programNode';
    name: string;
    publicKey: string;
    instructions?: StarFrameInstructionNode[];
    definedTypes?: CodamaNode[];
};

export type StarFrameInstructionAccountNode = {
    kind: 'instructionAccountNode';
    name: string;
    isWritable: boolean;
    isSigner: boolean;
    isOptional?: boolean;
};

export type StarFrameInstructionNode = {
    kind: 'instructionNode';
    name: string;
    accounts?: StarFrameInstructionAccountNode[];
    arguments?: StarFrameInstructionArgumentNode[];
    discriminators?: CodamaNode[];
};

export type StarFrameInstructionArgumentNode = {
    kind: 'instructionArgumentNode';
    name: string;
    type: CodamaNode;
    defaultValueStrategy?: string;
    defaultValue?: CodamaNode;
};

export type StarFrameValue =
    | string
    | number
    | bigint
    | boolean
    | null
    | StarFrameValue[]
    | {
          [key: string]: StarFrameValue;
      };

export type StarFrameDecodedArgument = {
    name: string;
    type: CodamaNode;
    value: StarFrameValue;
};

export type StarFrameProgramDefinition = {
    idl: StarFrameIdl;
    name: string;
    displayName: string;
    publicKey: string;
    definedTypes: Map<string, CodamaNode>;
    instructions: StarFrameInstructionNode[];
    instructionByDiscriminator: Map<string, StarFrameInstructionNode>;
};

export type StarFrameDecodedInstruction =
    | {
          status: 'decoded';
          program: StarFrameProgramDefinition;
          instruction: StarFrameInstructionNode;
          arguments: StarFrameDecodedArgument[];
      }
    | {
          status: 'error';
          program: StarFrameProgramDefinition;
          instruction?: StarFrameInstructionNode;
          arguments: StarFrameDecodedArgument[];
          error: string;
      };

const STARFRAME_IDLS: Array<{ displayName: string; idl: StarFrameIdl }> = [
    { displayName: 'SAGE', idl: sageIdl as StarFrameIdl },
    { displayName: 'Player Profile', idl: playerProfileIdl as StarFrameIdl },
    { displayName: 'Profile Faction', idl: profileFactionIdl as StarFrameIdl },
    { displayName: 'Profile Subscription', idl: profileSubscriptionIdl as StarFrameIdl },
];

export const STARFRAME_PROGRAMS = STARFRAME_IDLS.map(({ idl, displayName }) =>
    createStarFrameProgramDefinition(idl, displayName)
);

const STARFRAME_PROGRAMS_BY_ID = new Map(STARFRAME_PROGRAMS.map(program => [program.publicKey, program]));
const STARFRAME_PROGRAMS_BY_NAME = new Map(STARFRAME_PROGRAMS.map(program => [program.name, program]));

export function getStarFrameProgram(programId: string): StarFrameProgramDefinition | undefined {
    return STARFRAME_PROGRAMS_BY_ID.get(programId);
}

export function decodeStarFrameInstruction(ix: TransactionInstruction): StarFrameDecodedInstruction | null {
    const program = getStarFrameProgram(ix.programId.toBase58());
    if (!program) {
        return null;
    }

    const data = Buffer.from(ix.data);
    const discriminator = data.slice(0, 8).toString('hex');
    const instruction = program.instructionByDiscriminator.get(discriminator);
    if (!instruction) {
        return {
            arguments: [],
            error: `Unknown StarFrame instruction discriminator ${discriminator}`,
            program,
            status: 'error',
        };
    }

    const decodedArguments: StarFrameDecodedArgument[] = [];
    const decoder = new StarFrameDecoder(data, program, 8);

    try {
        for (const argument of instruction.arguments ?? []) {
            if (isOmittedDiscriminatorArgument(argument)) {
                continue;
            }

            decodedArguments.push({
                name: argument.name,
                type: argument.type,
                value: decoder.decodeType(argument.type),
            });
        }

        if (decoder.remainingBytes() !== 0) {
            throw new Error(
                `${decoder.remainingBytes()} unread byte(s) after decoding ${program.displayName}:${instruction.name}`
            );
        }

        return {
            arguments: decodedArguments,
            instruction,
            program,
            status: 'decoded',
        };
    } catch (error) {
        return {
            arguments: decodedArguments,
            error: error instanceof Error ? error.message : String(error),
            instruction,
            program,
            status: 'error',
        };
    }
}

export function getStarFrameTypeLabel(type: CodamaNode): string {
    switch (type.kind) {
        case 'arrayTypeNode':
            if (type.count?.kind === 'fixedCountNode') {
                return `${getStarFrameTypeLabel(type.item)}[${type.count.value}]`;
            }
            return `${getStarFrameTypeLabel(type.item)}[]`;
        case 'booleanTypeNode':
            return 'bool';
        case 'bytesTypeNode':
            return 'bytes';
        case 'definedTypeLinkNode':
            return type.program?.name ? `${type.program.name}.${type.name}` : type.name;
        case 'enumTypeNode':
            return 'enum';
        case 'fixedSizeTypeNode':
            if (type.type?.kind === 'bytesTypeNode') {
                return `bytes[${type.size}]`;
            }
            return `${getStarFrameTypeLabel(type.type)} (${type.size} bytes)`;
        case 'mapTypeNode':
            return `Map<${getStarFrameTypeLabel(type.key)}, ${getStarFrameTypeLabel(type.value)}>`;
        case 'numberTypeNode':
            return type.format;
        case 'optionTypeNode':
            return `Option<${getStarFrameTypeLabel(type.item)}>`;
        case 'publicKeyTypeNode':
            return 'PublicKey';
        case 'setTypeNode':
            return `Set<${getStarFrameTypeLabel(type.item)}>`;
        case 'structTypeNode':
            return 'struct';
        case 'tupleTypeNode':
            return `(${(type.items ?? []).map(getStarFrameTypeLabel).join(', ')})`;
        default:
            return type.kind.replace(/TypeNode$/, '');
    }
}

export function stringifyStarFrameValue(value: StarFrameValue): string {
    if (typeof value === 'bigint') {
        return value.toString();
    }

    if (typeof value !== 'object' || value === null) {
        return String(value);
    }

    return JSON.stringify(
        value,
        (_key, currentValue) => (typeof currentValue === 'bigint' ? currentValue.toString() : currentValue),
        2
    );
}

function createStarFrameProgramDefinition(idl: StarFrameIdl, displayName: string): StarFrameProgramDefinition {
    const definedTypes = new Map((idl.definedTypes ?? []).map(type => [type.name, type]));
    const instructionByDiscriminator = new Map<string, StarFrameInstructionNode>();

    for (const instruction of idl.instructions ?? []) {
        const discriminator = getInstructionDiscriminator(instruction);
        if (discriminator) {
            instructionByDiscriminator.set(discriminator, instruction);
        }
    }

    return {
        definedTypes,
        displayName,
        idl,
        instructionByDiscriminator,
        instructions: idl.instructions ?? [],
        name: idl.name,
        publicKey: idl.publicKey,
    };
}

function getInstructionDiscriminator(instruction: StarFrameInstructionNode): string | undefined {
    const discriminatorArgument = (instruction.arguments ?? []).find(argument => argument.name === 'discriminator');
    const defaultValue = discriminatorArgument?.defaultValue;

    if (defaultValue?.kind === 'bytesValueNode' && defaultValue.encoding === 'base16') {
        return defaultValue.data.toLowerCase();
    }

    return undefined;
}

function isOmittedDiscriminatorArgument(argument: StarFrameInstructionArgumentNode): boolean {
    return argument.name === 'discriminator' && argument.defaultValueStrategy === 'omitted';
}

class StarFrameDecoder {
    private offset: number;
    private program: StarFrameProgramDefinition;

    constructor(private readonly data: Buffer, program: StarFrameProgramDefinition, offset = 0) {
        this.offset = offset;
        this.program = program;
    }

    remainingBytes(): number {
        return this.data.length - this.offset;
    }

    decodeType(type: CodamaNode): StarFrameValue {
        switch (type.kind) {
            case 'arrayTypeNode':
                return this.decodeArray(type);
            case 'booleanTypeNode':
                return Boolean(this.decodeType(type.size));
            case 'definedTypeLinkNode':
                return this.decodeDefinedType(type);
            case 'enumTypeNode':
                return this.decodeEnum(type);
            case 'fixedSizeTypeNode':
                return this.decodeFixedSize(type);
            case 'mapTypeNode':
                return this.decodeMap(type);
            case 'numberTypeNode':
                return this.decodeNumber(type);
            case 'optionTypeNode':
                return this.decodeOption(type);
            case 'publicKeyTypeNode':
                return new PublicKey(this.readBytes(32)).toBase58();
            case 'setTypeNode':
                return this.decodeSet(type);
            case 'structTypeNode':
                return this.decodeStruct(type);
            case 'tupleTypeNode':
                return this.decodeTuple(type);
            default:
                throw new Error(`Unsupported StarFrame Codama type node ${type.kind}`);
        }
    }

    private decodeArray(type: CodamaNode): StarFrameValue[] {
        const items: StarFrameValue[] = [];

        if (type.count?.kind === 'remainderCountNode') {
            while (this.remainingBytes() > 0) {
                items.push(this.decodeType(type.item));
            }
            return items;
        }

        const count = this.decodeCount(type.count);
        for (let index = 0; index < count; index++) {
            items.push(this.decodeType(type.item));
        }

        return items;
    }

    private decodeCount(count: CodamaNode | undefined): number {
        if (!count) {
            throw new Error('Missing count node');
        }

        switch (count.kind) {
            case 'fixedCountNode':
                return count.value;
            case 'prefixedCountNode':
                return assertSafeCount(this.decodeType(count.prefix));
            default:
                throw new Error(`Unsupported StarFrame count node ${count.kind}`);
        }
    }

    private decodeDefinedType(type: CodamaNode): StarFrameValue {
        const previousProgram = this.program;
        const program = this.resolveProgramForType(type);
        const definedType = program.definedTypes.get(type.name);

        if (!definedType) {
            throw new Error(`Unknown StarFrame defined type ${program.name}.${type.name}`);
        }

        this.program = program;
        try {
            return this.decodeType(definedType.type);
        } finally {
            this.program = previousProgram;
        }
    }

    private decodeEnum(type: CodamaNode): StarFrameValue {
        const discriminator = assertSafeCount(this.decodeType(type.size));
        const variant =
            (type.variants ?? []).find((candidate: CodamaNode, index: number) => {
                return (candidate.discriminator ?? index) === discriminator;
            }) ?? null;

        if (!variant) {
            throw new Error(`Unknown enum discriminator ${discriminator}`);
        }

        if (variant.kind === 'enumEmptyVariantTypeNode') {
            return { variant: variant.name };
        }

        if (variant.kind === 'enumTupleVariantTypeNode') {
            return {
                value: this.decodeType(variant.tuple),
                variant: variant.name,
            };
        }

        throw new Error(`Unsupported StarFrame enum variant node ${variant.kind}`);
    }

    private decodeFixedSize(type: CodamaNode): StarFrameValue {
        if (type.type?.kind === 'bytesTypeNode') {
            return this.readBytes(type.size).toString('hex');
        }

        const initialOffset = this.offset;
        const value = this.decodeType(type.type);
        const consumedBytes = this.offset - initialOffset;

        if (consumedBytes !== type.size) {
            throw new Error(`Expected fixed size ${type.size} bytes, decoded ${consumedBytes} bytes`);
        }

        return value;
    }

    private decodeMap(type: CodamaNode): StarFrameValue[] {
        const count = this.decodeCount(type.count);
        const entries: StarFrameValue[] = [];

        for (let index = 0; index < count; index++) {
            entries.push({
                key: this.decodeType(type.key),
                value: this.decodeType(type.value),
            });
        }

        return entries;
    }

    private decodeNumber(type: CodamaNode): number | bigint {
        const format = type.format;
        const endian = type.endian ?? 'le';

        if (endian !== 'le') {
            throw new Error(`Unsupported ${endian} endian number ${format}`);
        }

        switch (format) {
            case 'f32': {
                return this.readBytes(4).readFloatLE(0);
            }
            case 'f64': {
                return this.readBytes(8).readDoubleLE(0);
            }
            case 'i8':
                return Number(this.readInteger(1, true));
            case 'u8':
                return Number(this.readInteger(1, false));
            case 'i16':
                return Number(this.readInteger(2, true));
            case 'u16':
                return Number(this.readInteger(2, false));
            case 'i32':
                return Number(this.readInteger(4, true));
            case 'u32':
                return Number(this.readInteger(4, false));
            case 'i64':
                return this.readInteger(8, true);
            case 'u64':
                return this.readInteger(8, false);
            case 'i128':
                return this.readInteger(16, true);
            case 'u128':
                return this.readInteger(16, false);
            default:
                throw new Error(`Unsupported StarFrame number format ${format}`);
        }
    }

    private decodeOption(type: CodamaNode): StarFrameValue {
        const prefix = assertSafeCount(this.decodeType(type.prefix));
        if (prefix === 0) {
            return null;
        }
        if (prefix === 1) {
            return this.decodeType(type.item);
        }
        throw new Error(`Unsupported option prefix ${prefix}`);
    }

    private decodeSet(type: CodamaNode): StarFrameValue[] {
        const count = this.decodeCount(type.count);
        const items: StarFrameValue[] = [];

        for (let index = 0; index < count; index++) {
            items.push(this.decodeType(type.item));
        }

        return items;
    }

    private decodeStruct(type: CodamaNode): StarFrameValue {
        return (type.fields ?? []).reduce((data: Record<string, StarFrameValue>, field: CodamaNode) => {
            data[field.name] = this.decodeType(field.type);
            return data;
        }, {});
    }

    private decodeTuple(type: CodamaNode): StarFrameValue[] {
        return (type.items ?? []).map((item: CodamaNode) => this.decodeType(item));
    }

    private readBytes(length: number): Buffer {
        if (this.offset + length > this.data.length) {
            throw new Error(`Not enough bytes: needed ${length}, found ${this.remainingBytes()}`);
        }

        const bytes = this.data.subarray(this.offset, this.offset + length);
        this.offset += length;
        return bytes;
    }

    private readInteger(byteLength: number, signed: boolean): bigint {
        const bytes = this.readBytes(byteLength);
        let value = 0n;

        for (let index = 0; index < bytes.length; index++) {
            value += BigInt(bytes[index]) << BigInt(index * 8);
        }

        if (signed) {
            const bitLength = BigInt(byteLength * 8);
            const signBit = 1n << (bitLength - 1n);
            if ((value & signBit) !== 0n) {
                value -= 1n << bitLength;
            }
        }

        return value;
    }

    private resolveProgramForType(type: CodamaNode): StarFrameProgramDefinition {
        const linkedProgramName = type.program?.name;
        if (!linkedProgramName) {
            return this.program;
        }

        const linkedProgram = STARFRAME_PROGRAMS_BY_NAME.get(linkedProgramName);
        if (!linkedProgram) {
            throw new Error(`Unknown StarFrame linked program ${linkedProgramName}`);
        }

        return linkedProgram;
    }
}

function assertSafeCount(value: StarFrameValue): number {
    if (typeof value !== 'number' && typeof value !== 'bigint') {
        throw new Error(`Expected numeric count, received ${typeof value}`);
    }

    const numberValue = Number(value);
    if (!Number.isSafeInteger(numberValue) || numberValue < 0) {
        throw new Error(`Invalid StarFrame collection count ${value.toString()}`);
    }

    return numberValue;
}

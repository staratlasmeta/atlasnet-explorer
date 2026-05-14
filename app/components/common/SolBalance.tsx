import { NATIVE_TOKEN_SYMBOL } from '@utils/cluster';
import { lamportsToSolString } from '@utils/index';
import React from 'react';

export function SolBalance({
    lamports,
    maximumFractionDigits = 9,
}: {
    lamports: number | bigint;
    maximumFractionDigits?: number;
}) {
    const tokenPrefix = NATIVE_TOKEN_SYMBOL === 'SOL' ? '◎' : `${NATIVE_TOKEN_SYMBOL} `;

    return (
        <span>
            {tokenPrefix}
            <span className="font-monospace">{lamportsToSolString(lamports, maximumFractionDigits)}</span>
        </span>
    );
}

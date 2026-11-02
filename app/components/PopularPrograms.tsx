'use client';

import { useCluster } from '@providers/cluster';
import { Cluster } from '@utils/cluster';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';

const PROGRAMS = [
    { address: 'HYEWZXXzMyrnN89ASYPVHHdFdgvrgV8diFLv6P2wEwFN', name: 'SAGE Dev (HYE)' },
    { address: 'C4SAgeKLgb3pTLWhVr6NRwWyYFuTR7ZeSXFrzoLwfMzF', name: 'SAGE Primary (C4SAge)' },
];

export function PopularPrograms() {
    const { cluster } = useCluster();
    if (cluster !== Cluster.Zink) return null;

    return (
        <section className="card mb-4" aria-labelledby="popular-programs-heading">
            <div className="card-header">
                <h2 className="card-header-title" id="popular-programs-heading">
                    Popular programs
                </h2>
            </div>
            <div className="card-body">
                <div className="row g-3">
                    {PROGRAMS.map(program => (
                        <div className="col-12 col-md-6" key={program.address}>
                            <ProgramLink {...program} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function ProgramLink({ name, address }: { name: string; address: string }) {
    const href = useClusterPath({ pathname: `/address/${address}` });
    return (
        <Link href={href} className="d-block rounded border p-3">
            <span className="d-block fw-bold">{name}</span>
            <span className="d-block text-break font-monospace small">{address}</span>
        </Link>
    );
}

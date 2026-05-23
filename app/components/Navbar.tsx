'use client';

import Logo from '@img/logos-solana/dark-explorer-logo.svg';
import ZinkLogo from '@img/logos-zink/zink-logo.svg';
import { useDisclosure } from '@mantine/hooks';
import { explorerAppName } from '@utils/network';
import { useClusterPath } from '@utils/url';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegment, useSelectedLayoutSegments } from 'next/navigation';
import React, { ReactNode } from 'react';

import { ClusterStatusButton } from './ClusterStatusButton';

export interface INavbarProps {
    children?: ReactNode;
}

export function Navbar({ children }: INavbarProps) {
    const [navOpened, navHandlers] = useDisclosure(false);
    const isZinkFlavor = process.env.NEXT_PUBLIC_FLAVOR === 'zink';
    const logo = isZinkFlavor ? ZinkLogo : Logo;
    const logoDimensions = isZinkFlavor ? { height: 24, width: 72 } : { height: 22, width: 214 };
    const homePath = useClusterPath({ pathname: '/' });
    const supplyPath = useClusterPath({ pathname: '/supply' });
    const inspectorPath = useClusterPath({ pathname: '/tx/inspector' });
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const selectedLayoutSegments = useSelectedLayoutSegments();
    return (
        <nav className="navbar navbar-expand-lg navbar-light">
            <div className="container px-4">
                <Link href={homePath}>
                    <Image alt={explorerAppName()} src={logo} {...logoDimensions} />
                </Link>

                <button className="navbar-toggler" type="button" onClick={navHandlers.toggle}>
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="navbar-children d-flex align-items-center flex-grow-1 w-100 h-100 d-none d-lg-block">
                    {children}
                </div>

                <div className={`collapse navbar-collapse ms-auto ${navOpened ? 'show' : ''} flex-shrink-0`}>
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <Link
                                className={`nav-link${selectedLayoutSegment === null ? ' active' : ''}`}
                                href={homePath}
                            >
                                Cluster Stats
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link${selectedLayoutSegment === 'supply' ? ' active' : ''}`}
                                href={supplyPath}
                            >
                                Supply
                            </Link>
                        </li>
                        <li className="nav-item">
                            <Link
                                className={`nav-link${
                                    selectedLayoutSegments[0] === 'tx' && selectedLayoutSegments[1] === '(inspector)'
                                        ? ' active'
                                        : ''
                                }`}
                                href={inspectorPath}
                            >
                                Inspector
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="d-none d-lg-block flex-shrink-0 ms-1">
                    <ClusterStatusButton />
                </div>
            </div>
        </nav>
    );
}

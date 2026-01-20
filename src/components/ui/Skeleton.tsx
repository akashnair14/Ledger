'use client';

import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
    type?: 'text' | 'circle' | 'rect' | 'card' | 'avatar';
    width?: string | number;
    height?: string | number;
    className?: string;
    style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    type = 'rect',
    width,
    height,
    className = '',
    style
}) => {
    const combinedStyles: React.CSSProperties = {
        width: width || undefined,
        height: height || undefined,
        ...style
    };

    return (
        <div
            className={`${styles.skeleton} ${styles[type]} ${className}`}
            style={combinedStyles}
        />
    );
};

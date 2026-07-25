'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
}

export function AnimatedNumber({ value }: AnimatedNumberProps) {
    const count = useMotionValue(0);
    const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString('en-IN'));
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const controls = animate(count, value, { duration: 0.8, ease: 'easeOut' });
        return controls.stop;
    }, [value, count]);

    return <motion.span ref={ref}>{rounded}</motion.span>;
}

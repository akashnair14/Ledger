'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface AnimatedNumberProps {
    value: number;
}

export function AnimatedNumber({ value }: AnimatedNumberProps) {
    const prevValueRef = useRef(value);
    const count = useMotionValue(value);
    const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString('en-IN'));

    useEffect(() => {
        if (prevValueRef.current !== value) {
            const controls = animate(count, value, { duration: 0.4, ease: 'easeOut' });
            prevValueRef.current = value;
            return controls.stop;
        }
    }, [value, count]);

    return <motion.span>{rounded}</motion.span>;
}

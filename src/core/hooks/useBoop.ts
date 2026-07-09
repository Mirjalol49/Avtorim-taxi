import { useState, useEffect, useCallback } from 'react';
import { useSpring } from 'react-spring';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

interface BoopConfig {
    x?: number;
    y?: number;
    rotation?: number;
    scale?: number;
    timing?: number;
}

export function useBoop({
    x = 0,
    y = 0,
    rotation = 0,
    scale = 1,
    timing = 150,
}: BoopConfig = {}) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [isBooped, setIsBooped] = useState(false);

    const style = useSpring({
        transform: isBooped
            ? `translate3d(${x}px, ${y}px, 0px) rotate(${rotation}deg) scale(${scale})`
            : `translate3d(0px, 0px, 0px) rotate(0deg) scale(1)`,
        config: {
            tension: 300,
            friction: 10,
        },
    });

    useEffect(() => {
        if (!isBooped) return;
        const timeoutId = window.setTimeout(() => {
            setIsBooped(false);
        }, timing);
        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isBooped, timing]);

    const trigger = useCallback(() => {
        if (prefersReducedMotion) return;
        setIsBooped(true);
    }, [prefersReducedMotion]);

    return [prefersReducedMotion ? {} : style, trigger] as const;
}

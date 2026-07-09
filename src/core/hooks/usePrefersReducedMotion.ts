import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

    useEffect(() => {
        const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQueryList.matches);

        const listener = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mediaQueryList.addEventListener('change', listener);
        return () => {
            mediaQueryList.removeEventListener('change', listener);
        };
    }, []);

    return prefersReducedMotion;
}

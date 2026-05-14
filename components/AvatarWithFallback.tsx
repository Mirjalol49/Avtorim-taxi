import React, { useState, useEffect } from 'react';

interface AvatarWithFallbackProps {
    src?: string;
    alt: string;
    fallbackSeed: string;
    className?: string;
}

export const AvatarWithFallback: React.FC<AvatarWithFallbackProps> = ({ src, alt, fallbackSeed, className }) => {
    const [hasError, setHasError] = useState(false);

    // Reset error state if the src URL changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const dicebearUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackSeed)}`;

    if (!src || src.length < 10 || hasError) {
        return <img src={dicebearUrl} alt={alt} className={className} />;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setHasError(true)}
        />
    );
};

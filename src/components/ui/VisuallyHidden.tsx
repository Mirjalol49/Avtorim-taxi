import React, { useState, useEffect } from 'react';

interface VisuallyHiddenProps {
    children: React.ReactNode;
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children }) => {
    const [forceShow, setForceShow] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setForceShow(true);
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setForceShow(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    if (forceShow) {
        return (
            <span className="inline-block px-1 py-0.5 text-[9px] font-mono text-pink-500 bg-pink-500/10 border border-pink-500/20 rounded">
                [SR: {children}]
            </span>
        );
    }

    return (
        <span
            className="absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0"
            style={{
                clip: 'rect(0 0 0 0)',
                clipPath: 'inset(50%)',
            }}
        >
            {children}
        </span>
    );
};
export default VisuallyHidden;

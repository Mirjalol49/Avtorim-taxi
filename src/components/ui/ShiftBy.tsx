import React from 'react';

interface ShiftByProps {
    x?: number;
    y?: number;
    children: React.ReactNode;
}

export const ShiftBy: React.FC<ShiftByProps> = ({ x = 0, y = 0, children }) => {
    return (
        <div
            style={{
                transform: `translate(${x}px, ${y}px)`,
                display: 'inline-block',
            }}
        >
            {children}
        </div>
    );
};
export default ShiftBy;

import React from 'react';
import uzbekistanFlag from '../../../Images/uzbekistan_flag.png';

export interface LicensePlateProps {
    plate: string;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const LicensePlate: React.FC<LicensePlateProps> = ({ plate, size = 'md', className = '' }) => {
    if (!plate || plate.toLowerCase() === "noma'lum") {
        return <span className={`text-slate-500 font-medium ${className}`}>{plate || "Noma'lum"}</span>;
    }

    const plateMatch = plate.trim().match(/^(\d{2})\s*(.+)$/);
    const regionCode = plateMatch ? plateMatch[1] : '';
    const plateBody = plateMatch ? plateMatch[2] : plate;

    const sizeClasses = {
        sm: {
            height: 'h-[18px]',
            border: 'border-[1px]',
            regionPadding: 'pl-1 pr-1',
            screwLeft: 'left-[2px]',
            screwRight: 'right-[2px]',
            screwSize: 'w-[1.5px] h-[1.5px]',
            regionText: 'text-[9px]',
            bodyPadding: 'px-1.5',
            bodyText: 'text-[11px]',
            flagWidth: 'w-[8px]',
            flagText: 'text-[5px]',
            rightPadding: 'pl-[2px] pr-1.5'
        },
        md: {
            height: 'h-[22px]',
            border: 'border-[1px]',
            regionPadding: 'pl-1.5 pr-1',
            screwLeft: 'left-[2px]',
            screwRight: 'right-[2px]',
            screwSize: 'w-[1.5px] h-[1.5px]',
            regionText: 'text-[10px]',
            bodyPadding: 'px-2',
            bodyText: 'text-[13px]',
            flagWidth: 'w-[10px]',
            flagText: 'text-[6px]',
            rightPadding: 'pl-[3px] pr-1.5'
        },
        lg: {
            height: 'h-[26px]',
            border: 'border-[1.5px]',
            regionPadding: 'pl-2 pr-1.5',
            screwLeft: 'left-[3px]',
            screwRight: 'right-[3px]',
            screwSize: 'w-0.5 h-0.5',
            regionText: 'text-[12px]',
            bodyPadding: 'px-2.5',
            bodyText: 'text-[15px]',
            flagWidth: 'w-[12px]',
            flagText: 'text-[7px]',
            rightPadding: 'pl-1 pr-2'
        }
    };

    const s = sizeClasses[size];

    return (
        <div className={`inline-flex w-max items-stretch border-slate-900 rounded-[6px] bg-white shadow-sm overflow-hidden relative select-none flex-shrink-0 ${s.height} ${s.border} ${className}`}>
            {/* Left: Region Code */}
            {regionCode && (
                <div className={`flex items-center justify-center border-slate-900 relative ${s.regionPadding} ${s.border} border-y-0 border-l-0`}>
                    <div className={`absolute ${s.screwLeft} top-1/2 -translate-y-1/2 rounded-full bg-slate-300 border border-slate-400 ${s.screwSize}`} />
                    <span className={`font-black text-slate-900 leading-none pt-0.5 ${s.regionText}`}>{regionCode}</span>
                </div>
            )}
            
            {/* Middle: Plate Body */}
            <div className={`flex items-center justify-center ${s.bodyPadding}`}>
                <span className={`font-mono font-black text-slate-900 tracking-widest leading-none pt-0.5 ${s.bodyText}`}>
                    {plateBody}
                </span>
            </div>

            {/* Right: Flag & UZ */}
            <div className={`flex flex-col items-center justify-center relative ${s.rightPadding}`}>
                <div className={`absolute ${s.screwRight} top-1/2 -translate-y-1/2 rounded-full bg-slate-300 border border-slate-400 ${s.screwSize}`} />
                
                <img src={uzbekistanFlag} alt="UZ flag" className={`object-contain shadow-[0_0_1px_rgba(0,0,0,0.2)] mb-[1px] ${s.flagWidth}`} />
                <span className={`font-black text-[#0099B5] leading-none mt-[1px] tracking-tighter ${s.flagText}`}>
                    UZ
                </span>
            </div>
        </div>
    );
};

import React from 'react';

interface PageSkeletonProps {
    theme: 'light' | 'dark';
    variant?: 'drivers' | 'dashboard' | 'transactions' | 'generic';
}

// One animated shimmer bar
const Shimmer: React.FC<{
    className?: string;
    style?: React.CSSProperties;
    theme: 'light' | 'dark';
}> = ({ className = '', style, theme }) => (
    <div
        className={`rounded-xl animate-pulse ${theme === 'dark' ? 'bg-white/[0.07]' : 'bg-black/[0.06]'} ${className}`}
        style={style}
    />
);

// Single driver card skeleton
const DriverCardSkeleton: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`rounded-2xl border p-5 space-y-4 ${isDark ? 'bg-[#1c2333] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-3">
                <Shimmer theme={theme} className="w-12 h-12 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <Shimmer theme={theme} style={{ width: '55%', height: 14 }} />
                    <Shimmer theme={theme} style={{ width: '35%', height: 11 }} />
                </div>
                <Shimmer theme={theme} className="w-16 h-6 rounded-full" />
            </div>
            <div className="space-y-2">
                <Shimmer theme={theme} style={{ width: '100%', height: 8, borderRadius: 99 }} />
                <div className="flex justify-between">
                    <Shimmer theme={theme} style={{ width: '30%', height: 10 }} />
                    <Shimmer theme={theme} style={{ width: '20%', height: 10 }} />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
                {[1, 2, 3].map(i => (
                    <Shimmer key={i} theme={theme} style={{ height: 40 }} className="rounded-xl" />
                ))}
            </div>
        </div>
    );
};

// Stat card skeleton (for dashboard)
const StatCardSkeleton: React.FC<{ theme: 'light' | 'dark'; accent?: boolean }> = ({ theme, accent }) => {
    const isDark = theme === 'dark';
    return (
        <div
            className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-3 ${
                accent
                    ? 'bg-gradient-to-br from-teal-800 to-teal-700'
                    : isDark ? 'bg-[#1c2333] border border-white/[0.08]' : 'bg-white border border-gray-100'
            }`}
        >
            <div className="flex items-center gap-2">
                <Shimmer theme={accent ? 'dark' : theme} className="w-8 h-8 rounded-xl" />
                <Shimmer theme={accent ? 'dark' : theme} style={{ width: '45%', height: 11 }} />
            </div>
            <Shimmer theme={accent ? 'dark' : theme} style={{ width: '70%', height: 36 }} className="rounded-lg" />
            <Shimmer theme={accent ? 'dark' : theme} style={{ width: '25%', height: 10 }} />
        </div>
    );
};

// Transaction row skeleton
const TxRowSkeleton: React.FC<{ theme: 'light' | 'dark' }> = ({ theme }) => (
    <div className="flex items-center gap-4 px-5 py-4">
        <Shimmer theme={theme} className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <Shimmer theme={theme} style={{ width: '45%', height: 13 }} />
            <Shimmer theme={theme} style={{ width: '30%', height: 10 }} />
        </div>
        <div className="text-right space-y-2">
            <Shimmer theme={theme} style={{ width: 80, height: 13 }} />
            <Shimmer theme={theme} style={{ width: 55, height: 10 }} />
        </div>
    </div>
);

const PageSkeleton: React.FC<PageSkeletonProps> = ({ theme, variant = 'generic' }) => {
    const isDark = theme === 'dark';

    if (variant === 'drivers') {
        return (
            <div className="space-y-6">
                {/* Search bar + controls shimmer */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <Shimmer theme={theme} style={{ height: 48 }} className="flex-1 rounded-2xl" />
                    <Shimmer theme={theme} style={{ width: 120, height: 48 }} className="rounded-2xl" />
                    <Shimmer theme={theme} style={{ width: 100, height: 48 }} className="rounded-2xl" />
                </div>
                {/* Filter chips */}
                <div className="flex gap-2">
                    {[80, 110, 100].map((w, i) => (
                        <Shimmer key={i} theme={theme} style={{ width: w, height: 32 }} className="rounded-xl" />
                    ))}
                </div>
                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <DriverCardSkeleton key={i} theme={theme} />
                    ))}
                </div>
            </div>
        );
    }

    if (variant === 'dashboard') {
        return (
            <div className="space-y-6">
                {/* Time filter pills */}
                <div className="flex gap-2">
                    {[60, 80, 60, 60, 80].map((w, i) => (
                        <Shimmer key={i} theme={theme} style={{ width: w, height: 34 }} className="rounded-xl" />
                    ))}
                </div>
                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <StatCardSkeleton theme={theme} accent />
                    <StatCardSkeleton theme={theme} />
                    <div className="sm:col-span-2 lg:col-span-1">
                        <StatCardSkeleton theme={theme} />
                    </div>
                </div>
                {/* Status panel */}
                <div className={`rounded-2xl sm:rounded-3xl border overflow-hidden ${isDark ? 'bg-[#1c2333] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                    <div className="px-6 py-5 border-b border-white/[0.06] space-y-3">
                        <Shimmer theme={theme} style={{ width: '40%', height: 22 }} />
                        <div className="flex gap-2">
                            <Shimmer theme={theme} style={{ width: 90, height: 26 }} className="rounded-full" />
                            <Shimmer theme={theme} style={{ width: 100, height: 26 }} className="rounded-full" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="p-6 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Shimmer theme={theme} className="w-10 h-10 rounded-xl flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Shimmer theme={theme} style={{ width: '50%', height: 12 }} />
                                        <Shimmer theme={theme} style={{ width: '100%', height: 6, borderRadius: 99 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 space-y-3 border-t lg:border-t-0 lg:border-l border-white/[0.05]">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Shimmer theme={theme} className="w-10 h-10 rounded-xl flex-shrink-0" />
                                    <div className="flex-1 space-y-1.5">
                                        <Shimmer theme={theme} style={{ width: '50%', height: 12 }} />
                                        <Shimmer theme={theme} style={{ width: '100%', height: 6, borderRadius: 99 }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'transactions') {
        return (
            <div className="space-y-5">
                {/* Filter bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Shimmer theme={theme} style={{ height: 44 }} className="flex-1 rounded-2xl" />
                    <Shimmer theme={theme} style={{ width: 160, height: 44 }} className="rounded-2xl" />
                    <Shimmer theme={theme} style={{ width: 130, height: 44 }} className="rounded-2xl" />
                </div>
                {/* Summary chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`p-4 rounded-2xl border ${isDark ? 'bg-[#1c2333] border-white/[0.08]' : 'bg-white border-gray-100'} space-y-2`}>
                            <Shimmer theme={theme} style={{ width: '60%', height: 11 }} />
                            <Shimmer theme={theme} style={{ width: '80%', height: 24 }} className="rounded-lg" />
                        </div>
                    ))}
                </div>
                {/* Transaction list */}
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#1c2333] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={`border-b last:border-b-0 ${isDark ? 'border-white/[0.05]' : 'border-gray-50'}`}>
                            <TxRowSkeleton theme={theme} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Generic fallback — used for payroll, finance, etc.
    return (
        <div className="space-y-5">
            <div className="flex gap-3">
                <Shimmer theme={theme} style={{ height: 44 }} className="flex-1 rounded-2xl" />
                <Shimmer theme={theme} style={{ width: 130, height: 44 }} className="rounded-2xl" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`rounded-2xl border p-5 space-y-4 ${isDark ? 'bg-[#1c2333] border-white/[0.08]' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <Shimmer theme={theme} className="w-11 h-11 rounded-xl flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Shimmer theme={theme} style={{ width: '40%', height: 14 }} />
                            <Shimmer theme={theme} style={{ width: '25%', height: 11 }} />
                        </div>
                        <Shimmer theme={theme} style={{ width: 90, height: 36 }} className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(j => (
                            <Shimmer key={j} theme={theme} style={{ height: 56 }} className="rounded-xl" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PageSkeleton;

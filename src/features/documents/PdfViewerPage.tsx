import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, DownloadIcon } from '../../../components/Icons';

const PdfViewerPage: React.FC = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const url  = params.get('url')  ?? '';
    const name = params.get('name') ?? 'Hujjat';
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        document.title = name;
        return () => { document.title = 'Avtorim'; };
    }, [name]);

    if (!url) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">Fayl topilmadi.</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-[#f0f0f0]">
            {/* Top bar */}
            <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0 bg-[#3c3c3c] shadow-md">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/[0.10] transition-colors flex-shrink-0"
                    title="Orqaga"
                >
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <p className="flex-1 font-medium text-white text-[14px] truncate">{name}</p>
                <a
                    href={url}
                    download={name}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white/70 hover:text-white hover:bg-white/[0.10] transition-colors flex-shrink-0"
                >
                    <DownloadIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Yuklab olish</span>
                </a>
            </div>

            {/* PDF iframe */}
            {!loaded && (
                <div className="absolute inset-0 top-[46px] flex items-center justify-center bg-[#f0f0f0] z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm">Yuklanmoqda…</p>
                    </div>
                </div>
            )}
            <iframe
                src={url}
                title={name}
                onLoad={() => setLoaded(true)}
                className="flex-1 w-full border-0"
                style={{ background: '#f0f0f0' }}
            />
        </div>
    );
};

export default PdfViewerPage;

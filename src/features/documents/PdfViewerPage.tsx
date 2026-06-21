import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, DownloadIcon } from '../../../components/Icons';
import { PdfCanvasPreview } from './PdfCanvasPreview';

const PdfViewerPage: React.FC = () => {
    const { t } = useTranslation();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const url  = params.get('url')  ?? '';
    const name = params.get('name') ?? 'Hujjat';

    useEffect(() => {
        document.title = name;
        return () => { document.title = 'Avtorim'; };
    }, [name]);

    if (!url) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
                <p className="text-gray-500">{t('fileNotFound')}</p>
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
                    title={t('back')}
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
                    <span className="hidden sm:inline">{t('download')}</span>
                </a>
            </div>

            <PdfCanvasPreview
                src={url}
                title={name}
                className="flex-1 bg-[#f0f0f0]"
            />
        </div>
    );
};

export default PdfViewerPage;

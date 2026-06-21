import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, DownloadIcon, FilePdfIcon } from '../../../components/Icons';
import { openDocumentInNewTab } from './pdfPreviewUtils';

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

            <div className="flex-1 flex items-center justify-center p-6 bg-[#f0f0f0]">
                <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <FilePdfIcon className="mx-auto mb-3 w-12 h-12 text-slate-400" />
                    <p className="text-[15px] font-black text-slate-900">{name}</p>
                    <p className="mt-1 text-[13px] text-slate-500">{t('documentPreviewUnavailable', "Bu faylni brauzerda ko'rib bo'lmadi. Yuklab oling yoki alohida oynada oching.")}</p>
                    <button
                        type="button"
                        onClick={() => openDocumentInNewTab(url)}
                        className="mt-4 h-10 px-5 rounded-xl bg-[#0f766e] text-white text-[13px] font-bold hover:bg-[#0b665f] transition-colors"
                    >
                        {t('open', 'Ochish')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PdfViewerPage;

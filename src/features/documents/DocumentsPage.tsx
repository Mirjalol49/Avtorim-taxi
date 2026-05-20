import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Document as Doc,
    DocumentCategory,
    DOCUMENTS_SETUP_SQL,
    formatBytes,
    getCategory,
    subscribeToDocuments,
    uploadDocument,
    deleteDocument,
    updateDocumentMeta,
} from '../../../services/documentsService';
import {
    UploadCloudIcon,
    FileIcon,
    FileImageIcon,
    FilePdfIcon,
    FileArchiveIcon,
    DownloadIcon,
    TrashIcon,
    SearchIcon,
    XIcon,
    FolderOpenIcon,
    EditIcon,
    CopyIcon,
    CheckIcon,
} from '../../../components/Icons';

// ─── helpers ──────────────────────────────────────────────────────────────────

// No video support — videos filtered at upload time
function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
    const cat = getCategory(mimeType);
    if (cat === 'image') return <FileImageIcon className={className} />;
    if (cat === 'pdf')   return <FilePdfIcon className={className} />;
    return <FileIcon className={className} />;
}

function categoryLabel(cat: DocumentCategory, t: any): string {
    return { all: t('all', 'Barchasi'), image: t('images', 'Rasmlar'), pdf: 'PDF', video: 'Video', other: t('other', 'Boshqa') }[cat];
}

const CATEGORIES: DocumentCategory[] = ['all', 'image', 'pdf', 'other'];

const MAX_FILE_MB = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// ─── component ────────────────────────────────────────────────────────────────

interface DocumentsPageProps {
    theme: 'dark' | 'light';
    fleetId: string;
    userName: string;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ theme, fleetId, userName }) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const openDoc = (doc: Doc) => {
        if (getCategory(doc.file_type) === 'pdf') {
            // Open PDFs directly in a new browser tab — native viewer, no hassle
            window.open(doc.file_url, '_blank', 'noopener,noreferrer');
        } else if (getCategory(doc.file_type) === 'image') {
            setPreviewDoc(doc);
        } else {
            // For other files (docx, xlsx, etc.) just open/download in new tab
            window.open(doc.file_url, '_blank', 'noopener,noreferrer');
        }
    };

    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [setupNeeded, setSetupNeeded] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<DocumentCategory>('all');

    // upload state
    const refetchRef = useRef<() => Promise<void>>(() => Promise.resolve());
    const [uploading, setUploading] = useState(false);
    const [uploadCurrentFile, setUploadCurrentFile] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0); // 0-100 overall
    const [dragOver, setDragOver] = useState(false);

    // modal state
    const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
    const [editDoc, setEditDoc] = useState<Doc | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<Doc | null>(null);
    const [uploadModal, setUploadModal] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [pendingNames, setPendingNames] = useState<string[]>([]);
    const [pendingDescs, setPendingDescs] = useState<string[]>([]);
    const [oversizedFiles, setOversizedFiles] = useState<File[]>([]);
    const [videoFiles, setVideoFiles] = useState<File[]>([]);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Subscribe to documents
    useEffect(() => {
        if (!fleetId) return;
        setLoading(true);
        const { unsubscribe, refetch } = subscribeToDocuments(
            fleetId,
            (data) => { setDocs(data); setLoading(false); setSetupNeeded(false); },
            () => { setSetupNeeded(true); setLoading(false); },
        );
        refetchRef.current = refetch;
        return unsubscribe;
    }, [fleetId]);

    // Filtered docs
    const filtered = docs.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.original_name.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === 'all' || getCategory(d.file_type) === category;
        return matchSearch && matchCat;
    });

    // ── upload ────────────────────────────────────────────────────────────────
    const resetUploadModal = () => {
        setPendingFiles([]);
        setPendingNames([]);
        setPendingDescs([]);
        setOversizedFiles([]);
        setVideoFiles([]);
        setUploadModal(false);
    };

    const startUpload = (files: FileList | File[]) => {
        const all = Array.from(files);
        if (!all.length) return;
        const videos = all.filter(f => f.type.startsWith('video/'));
        const nonVideo = all.filter(f => !f.type.startsWith('video/'));
        const ok  = nonVideo.filter(f => f.size <= MAX_FILE_BYTES);
        const big = nonVideo.filter(f => f.size > MAX_FILE_BYTES);
        setVideoFiles(videos);
        setOversizedFiles(big);
        setPendingFiles(ok);
        setPendingNames(ok.map(f => f.name.replace(/\.[^.]+$/, '')));
        setPendingDescs(ok.map(() => ''));
        setUploadModal(true);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        startUpload(e.dataTransfer.files);
    }, []);

    const confirmUpload = async () => {
        if (!pendingFiles.length) return;
        setUploading(true);
        setUploadModal(false);
        const total = pendingFiles.length;
        for (let i = 0; i < total; i++) {
            const file = pendingFiles[i];
            setUploadCurrentFile(pendingNames[i] || file.name);
            // Simulate smooth progress per file
            const base = Math.round((i / total) * 100);
            const next = Math.round(((i + 1) / total) * 100);
            setUploadProgress(base);
            // Animate from base → next over the upload
            const steps = 8;
            const stepMs = 120;
            for (let s = 1; s <= steps; s++) {
                await new Promise(r => setTimeout(r, stepMs));
                setUploadProgress(base + Math.round(((next - base) * s) / steps));
            }
            await uploadDocument(
                file,
                fleetId,
                pendingNames[i] || file.name,
                pendingDescs[i] || '',
                userName,
            );
            setUploadProgress(next);
        }
        setUploadProgress(100);
        // Force immediate refetch so newly uploaded files appear without waiting for realtime
        await refetchRef.current();
        setTimeout(() => {
            setUploading(false);
            setUploadProgress(0);
            setUploadCurrentFile('');
        }, 600);
        setPendingFiles([]);
        setPendingNames([]);
        setPendingDescs([]);
        setOversizedFiles([]);
        setVideoFiles([]);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteConfirm) return;
        const docToDelete = deleteConfirm;
        setDeleteConfirm(null);
        if (previewDoc?.id === docToDelete.id) setPreviewDoc(null);
        // Optimistic remove from local state immediately
        setDocs(prev => prev.filter(d => d.id !== docToDelete.id));
        await deleteDocument(docToDelete);
        // Force refetch to confirm server state
        await refetchRef.current();
    };

    const handleEditSave = async () => {
        if (!editDoc) return;
        await updateDocumentMeta(editDoc.id, editName, editDesc);
        setEditDoc(null);
        await refetchRef.current();
    };

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // ── styles ────────────────────────────────────────────────────────────────
    const card = isDark
        ? 'bg-surface border-white/[0.08] hover:border-white/[0.18]'
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md';
    const inputCls = isDark
        ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]'
        : 'bg-white border-gray-200 text-black placeholder-black/30 focus:border-[#0f766e]';
    const mutedText = isDark ? 'text-white/40' : 'text-black/40';
    const bodyText  = isDark ? 'text-white/70' : 'text-black/70';

    // ── setup banner ──────────────────────────────────────────────────────────
    if (setupNeeded) {
        return (
            <div className="space-y-4 animate-fadeIn">
                <div className={`rounded-2xl border p-6 ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('documentsSetupRequired')}
                    </p>
                    <p className={`text-xs mb-4 ${mutedText}`}>{t('documentsSetupSqlInstruction')}</p>
                    <pre className={`text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-emerald-400' : 'bg-gray-50 text-gray-700'}`}>
                        {DOCUMENTS_SETUP_SQL}
                    </pre>
                    <button
                        onClick={() => copyUrl(DOCUMENTS_SETUP_SQL)}
                        className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0f766e] text-white hover:bg-[#0a5c56] transition-colors"
                    >
                        <CopyIcon className="w-3.5 h-3.5" />
                        {copied ? t('copied') : t('copySql')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fadeIn">

            {/* ── Upload progress bar (fixed, top of page content) ─────────── */}
            {uploading && (
                <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="px-4 py-3 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-[#0f766e]/20' : 'bg-[#0f766e]/10'}`}>
                            <UploadCloudIcon className="w-4 h-4 text-[#0f766e] animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                                <p className={`text-[12px] font-semibold truncate ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                    {uploadProgress === 100 ? t('uploadedDone') : t('uploadingFile', { name: uploadCurrentFile })}
                                </p>
                                <span className={`text-[12px] font-bold ml-3 flex-shrink-0 ${uploadProgress === 100 ? 'text-emerald-500' : 'text-[#0f766e]'}`}>
                                    {uploadProgress}%
                                </span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-gray-100'}`}>
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ease-out ${uploadProgress === 100 ? 'bg-emerald-500' : 'bg-[#0f766e]'}`}
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('documents', 'Hujjatlar')}
                    </h2>
                    <p className={`text-[13px] mt-0.5 ${mutedText}`}>
                        {docs.length} {t('filesSaved', 'ta fayl saqlangan')}
                    </p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[14px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm"
                >
                    <UploadCloudIcon className="w-4 h-4" />
                    <span>{t('upload')}</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.heic,.HEIC,.jpg,.jpeg,.png,.webp,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
                    className="hidden"
                    onChange={e => e.target.files && startUpload(e.target.files)}
                />
            </div>

            {/* ── Search + filter ──────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${mutedText}`} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('searchFile', 'Fayl qidirish…')}
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${inputCls}`}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${mutedText}`}>
                            <XIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                <div className={`flex items-center gap-1 p-1 rounded-[14px] border self-start ${isDark ? 'bg-surface border-white/[0.07]' : 'bg-gray-100/70 border-gray-200'}`}>
                    {CATEGORIES.map(cat => {
                        const active = category === cat;
                        return (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[10px] text-[12px] font-bold transition-all ${
                                    active
                                        ? isDark ? 'bg-teal-500 text-white shadow-sm' : 'bg-white text-teal-700 shadow-sm border border-teal-100'
                                        : isDark ? 'text-white/35 hover:text-white/60' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {categoryLabel(cat, t)}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Drop zone / grid ─────────────────────────────────────────── */}
            {!loading && docs.length === 0 ? (
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-4 py-20 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                        dragOver
                            ? 'border-[#0f766e] bg-[#0f766e]/[0.05]'
                            : isDark ? 'border-white/[0.10] hover:border-white/[0.20]' : 'border-gray-200 hover:border-gray-400'
                    }`}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDark ? 'bg-surface-2' : 'bg-gray-100'}`}>
                        <FolderOpenIcon className={`w-8 h-8 ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
                    </div>
                    <div className="text-center">
                        <p className={`font-semibold text-base ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{t('noFiles', 'Fayl yo\'q')}</p>
                        <p className={`text-[13px] mt-1 ${mutedText}`}>{t('dropFilesHere', 'Bosing yoki fayllarni bu yerga tashlang')}</p>
                        <p className={`text-[11px] mt-1 ${mutedText}`}>{t('supportedFiles')} · {t('max')} {MAX_FILE_MB} MB</p>
                    </div>
                </div>
            ) : (
                <div
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className="relative"
                >
                    {dragOver && (
                        <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-[#0f766e] bg-[#0f766e]/[0.07] z-10 flex items-center justify-center pointer-events-none">
                            <p className="text-[#0f766e] font-semibold">{t('dropFilesNow')}</p>
                        </div>
                    )}
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className={`rounded-2xl border h-40 animate-pulse ${isDark ? 'bg-surface border-white/[0.05]' : 'bg-gray-100 border-gray-200'}`} />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${isDark ? 'bg-surface border-white/[0.06]' : 'bg-white border-gray-100'}`}>
                            <SearchIcon className={`w-8 h-8 mb-3 ${mutedText}`} />
                            <p className={`font-medium text-sm ${bodyText}`}>{t('noResultsFound', 'Hech narsa topilmadi')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filtered.map(doc => (
                                <DocumentCard
                                    key={doc.id}
                                    doc={doc}
                                    isDark={isDark}
                                    card={card}
                                    mutedText={mutedText}
                                    bodyText={bodyText}
                                    onPreview={() => openDoc(doc)}
                                    onEdit={() => { setEditDoc(doc); setEditName(doc.name); setEditDesc(doc.description); }}
                                    onDelete={() => setDeleteConfirm(doc)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Upload modal ─────────────────────────────────────────────── */}
            {uploadModal && (
                <Modal isDark={isDark} onClose={resetUploadModal}>
                    <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {t('uploadFile', 'Fayl yuklash')}
                    </h3>
                    <p className={`text-[12px] mb-4 ${mutedText}`}>
                        {pendingFiles.length > 0 ? `${pendingFiles.length} ${t('filesReady', 'ta fayl tayyor')}` : t('noFilesToUpload', 'Yuklash uchun fayl yo\'q')}
                    </p>

                    {/* Video warning */}
                    {videoFiles.length > 0 && (
                        <div className={`mb-3 rounded-xl border p-3 ${isDark ? 'bg-orange-500/[0.08] border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
                            <p className="text-[12px] font-bold text-orange-500 mb-1.5">🎬 {t('videoFilesUnsupported')}</p>
                            {videoFiles.map((f, i) => (
                                <p key={i} className={`text-[11px] ${isDark ? 'text-orange-400/70' : 'text-orange-400'}`}>• {f.name} ({formatBytes(f.size)})</p>
                            ))}
                        </div>
                    )}

                    {/* Oversized warning */}
                    {oversizedFiles.length > 0 && (
                        <div className={`mb-3 rounded-xl border p-3 ${isDark ? 'bg-red-500/[0.08] border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                            <p className="text-[12px] font-bold text-red-500 mb-1.5">⚠️ {t('filesTooLargeSkipped', { count: oversizedFiles.length, max: MAX_FILE_MB })}</p>
                            {oversizedFiles.map((f, i) => (
                                <p key={i} className={`text-[11px] ${isDark ? 'text-red-400/70' : 'text-red-400'}`}>• {f.name} ({formatBytes(f.size)})</p>
                            ))}
                        </div>
                    )}

                    {/* File list with name + comment */}
                    {pendingFiles.length > 0 && (
                        <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                            {pendingFiles.map((f, i) => (
                                <div key={i} className={`rounded-xl border p-3 ${isDark ? 'bg-surface-2 border-white/[0.06]' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center gap-2 mb-2.5">
                                        <FileTypeIcon mimeType={f.type} className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                                        <span className={`text-[11px] truncate flex-1 ${mutedText}`}>{f.name}</span>
                                        <span className={`text-[11px] flex-shrink-0 font-semibold ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{formatBytes(f.size)}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={pendingNames[i]}
                                        onChange={e => setPendingNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                                        placeholder={t('fileNamePlaceholder')}
                                        className={`w-full px-3 py-2 rounded-lg border text-[13px] outline-none transition-colors mb-2 ${isDark ? 'bg-surface border-white/[0.08] text-white placeholder-white/25 focus:border-[#0d9488]' : 'bg-white border-gray-200 text-black placeholder-gray-300 focus:border-[#0f766e]'}`}
                                    />
                                    <textarea
                                        value={pendingDescs[i]}
                                        onChange={e => setPendingDescs(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                                        placeholder={t('fileDescriptionPlaceholder')}
                                        rows={2}
                                        className={`w-full px-3 py-2 rounded-lg border text-[13px] outline-none transition-colors resize-none ${isDark ? 'bg-surface border-white/[0.08] text-white placeholder-white/25 focus:border-[#0d9488]' : 'bg-white border-gray-200 text-black placeholder-gray-300 focus:border-[#0f766e]'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={resetUploadModal}
                            className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        >
                            {t('cancel', 'Bekor qilish')}
                        </button>
                        {pendingFiles.length > 0 && (
                            <button
                                onClick={confirmUpload}
                                className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-colors"
                            >
                                {t('upload')}
                            </button>
                        )}
                    </div>
                </Modal>
            )}

            {/* ── Preview lightbox ─────────────────────────────────────────── */}
            {previewDoc && (
                <PreviewLightbox
                    doc={previewDoc}
                    isDark={isDark}
                    mutedText={mutedText}
                    bodyText={bodyText}
                    copied={copied}
                    onClose={() => setPreviewDoc(null)}
                    onCopy={() => copyUrl(previewDoc.file_url)}
                />
            )}

            {/* ── Edit modal ───────────────────────────────────────────────── */}
            {editDoc && (
                <Modal isDark={isDark} onClose={() => setEditDoc(null)}>
                    <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('editName', 'Nomni tahrirlash')}</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder={t('fileName', 'Fayl nomi')}
                            className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]' : 'bg-gray-50 border-gray-200 text-black focus:border-[#0f766e]'}`}
                        />
                        <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder={t('descriptionOptional', 'Tavsif (ixtiyoriy)')}
                            rows={3}
                            className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors resize-none ${isDark ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]' : 'bg-gray-50 border-gray-200 text-black focus:border-[#0f766e]'}`}
                        />
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setEditDoc(null)} className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                            {t('cancel', 'Bekor')}
                        </button>
                        <button onClick={handleEditSave} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-colors">
                            {t('save', 'Saqlash')}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Delete confirm ───────────────────────────────────────────── */}
            {deleteConfirm && (
                <Modal isDark={isDark} onClose={() => setDeleteConfirm(null)}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                        <TrashIcon className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('deleteFile', 'Faylni o\'chirish')}</h3>
                    <p className={`text-[13px] mb-5 ${mutedText}`}>
                        "<span className="font-semibold">{deleteConfirm.name}</span>" {t('confirmFileDelete', 'o\'chirilsinmi? Bu amalni qaytarib bo\'lmaydi.')}
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)} className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                            {t('cancel', 'Bekor')}
                        </button>
                        <button onClick={handleDeleteConfirmed} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors">
                            {t('delete', 'O\'chirish')}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── Preview Lightbox ──────────────────────────────────────────────────────────

interface LightboxProps {
    doc: Doc;
    isDark: boolean;
    mutedText: string;
    bodyText: string;
    copied: boolean;
    onClose: () => void;
    onCopy: () => void;
}

function PreviewLightbox({ doc, isDark, copied, onClose, onCopy }: LightboxProps) {
    const { t, i18n } = useTranslation();
    const cat = getCategory(doc.file_type);
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const dateStr = new Date(doc.created_at).toLocaleDateString(i18n.language, {
        day: '2-digit', month: 'short', year: 'numeric',
    });

    const hasNotes = Boolean(doc.description && doc.description.trim());

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={doc.name}
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5"
            style={{
                background: isDark ? 'rgba(2,6,23,0.62)' : 'rgba(15,23,42,0.28)',
                animation: 'docPreviewFade 0.2s ease-out',
            }}
            onClick={onClose}
        >
            <style>{`
                @keyframes docPreviewFade { from { opacity: 0 } to { opacity: 1 } }
                @keyframes docPreviewPop { from { opacity: 0; transform: scale(0.96) translateY(14px) } to { opacity: 1; transform: scale(1) translateY(0) } }
            `}</style>

            <div
                className={`relative flex flex-col w-full max-w-4xl max-h-[calc(100vh-32px)] rounded-[24px] overflow-hidden shadow-2xl border ${
                    isDark ? 'bg-[#101827] border-white/[0.08]' : 'bg-white border-gray-200'
                }`}
                style={{
                    animation: 'docPreviewPop 0.28s cubic-bezier(0.22,1,0.36,1)',
                    boxShadow: isDark ? '0 24px 70px rgba(0,0,0,0.45)' : '0 24px 70px rgba(15,23,42,0.22)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className={`flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b ${
                    isDark ? 'bg-[#172033] border-white/[0.07]' : 'bg-white border-black/[0.07]'
                }`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                            isDark ? 'bg-white/[0.07]' : 'bg-gray-100'
                        }`}>
                            <FileTypeIcon mimeType={doc.file_type} className={isDark ? 'w-5 h-5 text-white/55' : 'w-5 h-5 text-gray-500'} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[15px] font-bold truncate leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{doc.name}</p>
                            <p className={`text-[12px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {formatBytes(doc.file_size)} · {dateStr}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={onCopy}
                            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                                isDark ? 'text-gray-300 hover:text-white hover:bg-white/[0.08]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                            title={t('copyUrl')}
                        >
                            {copied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
                            <span>{copied ? t('copied') : 'URL'}</span>
                        </button>
                        <a
                            href={doc.file_url}
                            download={doc.original_name}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all active:scale-95 ${
                                isDark ? 'text-gray-300 hover:text-white hover:bg-white/[0.08]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                            title={t('download')}
                        >
                            <DownloadIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('download')}</span>
                        </a>
                        <button
                            autoFocus
                            onClick={onClose}
                            className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90 ${
                                isDark ? 'bg-white/[0.08] text-gray-300 hover:bg-white/[0.14] hover:text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                            }`}
                            title={t('close')}
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className={`flex-1 min-h-0 overflow-auto flex items-center justify-center p-3 sm:p-5 ${
                    isDark ? 'bg-[#0b1326]' : 'bg-slate-50'
                }`}>
                    {cat === 'image' ? (
                        <div className="relative w-full min-h-[260px] flex items-center justify-center">
                            {!imgLoaded && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className={`w-10 h-10 border-2 border-t-transparent rounded-full animate-spin ${
                                        isDark ? 'border-white/25 border-t-white/80' : 'border-gray-300 border-t-gray-700'
                                    }`} />
                                </div>
                            )}
                            <img
                                src={doc.file_url}
                                alt={doc.name}
                                onLoad={() => setImgLoaded(true)}
                                style={{ display: imgLoaded ? 'block' : 'none' }}
                                className={`max-w-full max-h-[calc(100vh-260px)] object-contain rounded-2xl select-none ${
                                    isDark ? 'shadow-2xl' : 'shadow-lg'
                                }`}
                            />
                        </div>
                    ) : (
                        <div className={`flex flex-col items-center gap-5 p-10 rounded-2xl border ${
                            isDark ? 'bg-white/[0.04] border-white/[0.10]' : 'bg-white border-gray-200'
                        }`}>
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                                <FileTypeIcon mimeType={doc.file_type} className={isDark ? 'w-10 h-10 text-white/30' : 'w-10 h-10 text-gray-400'} />
                            </div>
                            <div className="text-center max-w-xs">
                                <p className={`font-semibold text-base mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{doc.name}</p>
                                <p className={isDark ? 'text-white/40 text-sm' : 'text-gray-400 text-sm'}>{formatBytes(doc.file_size)}</p>
                            </div>
                            <a
                                href={doc.file_url}
                                download={doc.original_name}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#0a5c56] text-white font-semibold transition-colors active:scale-95"
                            >
                                <DownloadIcon className="w-4 h-4" /> {t('download')}
                            </a>
                        </div>
                    )}
                </div>

                <div className={`px-4 sm:px-5 py-3.5 border-t ${
                    isDark ? 'bg-[#172033] border-white/[0.07]' : 'bg-white border-black/[0.07]'
                }`}>
                    <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isDark ? 'bg-[#0f766e]/20 text-teal-300' : 'bg-teal-50 text-teal-700'
                        }`}>
                            <EditIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-bold uppercase tracking-[0.12em] mb-1 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>{t('note')}</p>
                            <div className={`text-[14px] leading-relaxed ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                                {hasNotes ? doc.description : <span className={isDark ? 'text-white/35' : 'text-gray-400'}>{t('noNoteAdded')}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── DocumentCard ──────────────────────────────────────────────────────────────

interface CardProps {
    doc: Doc;
    isDark: boolean;
    card: string;
    mutedText: string;
    bodyText: string;
    onPreview: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

function DocumentCard({ doc, isDark, card, mutedText, onPreview, onEdit, onDelete }: CardProps) {
    const { t, i18n } = useTranslation();
    const cat = getCategory(doc.file_type);
    const dateStr = new Date(doc.created_at).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${card}`}>
            <div
                onClick={onPreview}
                className={`relative flex items-center justify-center h-36 overflow-hidden ${isDark ? 'bg-surface-2' : 'bg-gray-50'}`}
            >
                {cat === 'image' ? (
                    <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : cat === 'pdf' ? (
                    <div className="flex flex-col items-center gap-2">
                        <FilePdfIcon className="w-10 h-10 text-red-400" />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-red-400/70' : 'text-red-400'}`}>PDF</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <FileIcon className={`w-10 h-10 ${isDark ? 'text-white/25' : 'text-gray-300'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            {doc.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                    </div>
                )}

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(); }}
                        className="p-2 rounded-xl bg-white/90 text-gray-700 hover:bg-white transition-colors shadow-sm"
                        title={t('editName')}
                    >
                        <EditIcon className="w-3.5 h-3.5" />
                    </button>
                    <a
                        href={doc.file_url}
                        download={doc.original_name}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-2 rounded-xl bg-white/90 text-gray-700 hover:bg-white transition-colors shadow-sm"
                        title={t('download')}
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                    </a>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="p-2 rounded-xl bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow-sm"
                        title={t('delete')}
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="px-3 py-2.5" onClick={onPreview}>
                <p className={`text-[13px] font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{doc.name}</p>
                <p className={`text-[11px] mt-0.5 ${mutedText}`}>{formatBytes(doc.file_size)} · {dateStr}</p>
                {doc.description && doc.description.trim() && (
                    <p className={`text-[11px] mt-1.5 leading-snug line-clamp-2 ${isDark ? 'text-white/45' : 'text-black/40'}`}>
                        <span className="mr-1">📝</span>{doc.description}
                    </p>
                )}
            </div>
        </div>
    );
}

// ─── Reusable Modal ────────────────────────────────────────────────────────────

function Modal({ children, isDark, onClose }: { children: React.ReactNode; isDark: boolean; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div
                className={`relative w-full max-w-md rounded-2xl shadow-2xl p-5 border`}
                style={{
                    background: isDark ? '#171f33' : '#ffffff',
                    borderColor: isDark ? 'rgba(255,255,255,0.10)' : '#e5e7eb',
                }}
            >
                {children}
            </div>
        </div>
    );
}

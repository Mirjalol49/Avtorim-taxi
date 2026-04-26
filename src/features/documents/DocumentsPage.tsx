import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    FileVideoIcon,
    FileArchiveIcon,
    DownloadIcon,
    TrashIcon,
    SearchIcon,
    XIcon,
    FolderOpenIcon,
    EditIcon,
    CopyIcon,
} from '../../../components/Icons';

// ─── helpers ──────────────────────────────────────────────────────────────────

function FileTypeIcon({ mimeType, className }: { mimeType: string; className?: string }) {
    const cat = getCategory(mimeType);
    if (cat === 'image')  return <FileImageIcon className={className} />;
    if (cat === 'pdf')    return <FilePdfIcon className={className} />;
    if (cat === 'video')  return <FileVideoIcon className={className} />;
    return <FileIcon className={className} />;
}

function categoryLabel(cat: DocumentCategory): string {
    return { all: 'Barchasi', image: 'Rasmlar', pdf: 'PDF', video: 'Video', other: "Boshqa" }[cat];
}

const CATEGORIES: DocumentCategory[] = ['all', 'image', 'pdf', 'video', 'other'];

const MAX_FILE_MB = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

// ─── component ────────────────────────────────────────────────────────────────

interface DocumentsPageProps {
    theme: 'dark' | 'light';
    fleetId: string;
    userName: string;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({ theme, fleetId, userName }) => {
    const isDark = theme === 'dark';

    const [docs, setDocs] = useState<Doc[]>([]);
    const [loading, setLoading] = useState(true);
    const [setupNeeded, setSetupNeeded] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<DocumentCategory>('all');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [dragOver, setDragOver] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<Doc | null>(null);
    const [editDoc, setEditDoc] = useState<Doc | null>(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<Doc | null>(null);
    const [uploadModal, setUploadModal] = useState(false);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [pendingNames, setPendingNames] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Subscribe to documents
    useEffect(() => {
        if (!fleetId) return;
        setLoading(true);
        const unsub = subscribeToDocuments(
            fleetId,
            (data) => { setDocs(data); setLoading(false); setSetupNeeded(false); },
            () => { setSetupNeeded(true); setLoading(false); },
        );
        return () => { unsub.then(fn => fn()); };
    }, [fleetId]);

    // Filtered docs
    const filtered = docs.filter(d => {
        const matchSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.original_name.toLowerCase().includes(search.toLowerCase());
        const matchCat = category === 'all' || getCategory(d.file_type) === category;
        return matchSearch && matchCat;
    });

    // ── upload ──────────────────────────────────────────────────────────────
    const startUpload = (files: FileList | File[]) => {
        const arr = Array.from(files).filter(f => f.size <= MAX_FILE_BYTES);
        if (!arr.length) return;
        setPendingFiles(arr);
        setPendingNames(arr.map(f => f.name.replace(/\.[^.]+$/, '')));
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
        for (let i = 0; i < pendingFiles.length; i++) {
            setUploadProgress(Math.round(((i) / pendingFiles.length) * 100));
            await uploadDocument(
                pendingFiles[i],
                fleetId,
                pendingNames[i] || pendingFiles[i].name,
                '',
                userName,
            );
        }
        setUploadProgress(100);
        setTimeout(() => { setUploading(false); setUploadProgress(0); }, 600);
        setPendingFiles([]);
        setPendingNames([]);
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteConfirm) return;
        await deleteDocument(deleteConfirm);
        setDeleteConfirm(null);
        if (previewDoc?.id === deleteConfirm.id) setPreviewDoc(null);
    };

    const handleEditSave = async () => {
        if (!editDoc) return;
        await updateDocumentMeta(editDoc.id, editName, editDesc);
        setEditDoc(null);
    };

    const copyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    // ── styles ──────────────────────────────────────────────────────────────
    const card = isDark
        ? 'bg-surface border-white/[0.08] hover:border-white/[0.16]'
        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md';
    const inputCls = isDark
        ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]'
        : 'bg-white border-gray-200 text-black placeholder-black/30 focus:border-[#0f766e]';
    const mutedText = isDark ? 'text-white/40' : 'text-black/40';
    const bodyText  = isDark ? 'text-white/70' : 'text-black/70';

    // ── setup banner ─────────────────────────────────────────────────────────
    if (setupNeeded) {
        return (
            <div className="space-y-4 animate-fadeIn">
                <div className={`rounded-2xl border p-6 ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Hujjatlar jadvalini sozlash kerak
                    </p>
                    <p className={`text-xs mb-4 ${mutedText}`}>Quyidagi SQL-ni Supabase SQL Editor'da ishga tushiring:</p>
                    <pre className={`text-[11px] rounded-xl p-4 overflow-x-auto leading-relaxed ${isDark ? 'bg-black/40 text-emerald-400' : 'bg-gray-50 text-gray-700'}`}>
                        {DOCUMENTS_SETUP_SQL}
                    </pre>
                    <button
                        onClick={() => copyUrl(DOCUMENTS_SETUP_SQL)}
                        className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0f766e] text-white hover:bg-[#0a5c56] transition-colors"
                    >
                        <CopyIcon className="w-3.5 h-3.5" />
                        {copied ? 'Nusxalandi!' : 'SQL nusxalash'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-fadeIn">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Hujjatlar
                    </h2>
                    <p className={`text-[13px] mt-0.5 ${mutedText}`}>
                        {docs.length} ta fayl saqlangan
                    </p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[14px] bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-all active:scale-95 shadow-sm"
                >
                    <UploadCloudIcon className="w-4 h-4" />
                    <span>Yuklash</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={e => e.target.files && startUpload(e.target.files)}
                />
            </div>

            {/* ── Search + filter ─────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <SearchIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${mutedText}`} />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Fayl qidirish…"
                        className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${inputCls}`}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${mutedText}`}>
                            <XIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
                {/* Category chips */}
                <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                                category === cat
                                    ? 'bg-[#0f766e] text-white'
                                    : isDark ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-black/50 hover:text-black hover:bg-black/[0.05]'
                            }`}
                        >
                            {categoryLabel(cat)}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Upload progress bar ─────────────────────────────────────── */}
            {uploading && (
                <div className={`rounded-xl border p-3 flex items-center gap-3 ${isDark ? 'bg-surface border-white/[0.08]' : 'bg-white border-gray-200'}`}>
                    <UploadCloudIcon className="w-4 h-4 text-[#0f766e] flex-shrink-0 animate-pulse" />
                    <div className="flex-1 min-w-0">
                        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.08]' : 'bg-gray-100'}`}>
                            <div className="h-full rounded-full bg-[#0f766e] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    </div>
                    <span className={`text-[12px] font-semibold flex-shrink-0 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{uploadProgress}%</span>
                </div>
            )}

            {/* ── Drop zone (shown when no docs) OR grid ───────────────────── */}
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
                        <p className={`font-semibold text-base ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Fayl yoq</p>
                        <p className={`text-[13px] mt-1 ${mutedText}`}>Bosing yoki fayllarni bu yerga tashlang</p>
                        <p className={`text-[11px] mt-1 ${mutedText}`}>Maksimal hajm: {MAX_FILE_MB} MB</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Drop overlay over existing grid */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className="relative"
                    >
                        {dragOver && (
                            <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-[#0f766e] bg-[#0f766e]/[0.07] z-10 flex items-center justify-center pointer-events-none">
                                <p className="text-[#0f766e] font-semibold">Tashlang!</p>
                            </div>
                        )}

                        {/* Skeleton loading */}
                        {loading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <div key={i} className={`rounded-2xl border h-40 animate-pulse ${isDark ? 'bg-surface border-white/[0.05]' : 'bg-gray-100 border-gray-200'}`} />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className={`flex flex-col items-center justify-center py-16 rounded-2xl border ${isDark ? 'bg-surface border-white/[0.06]' : 'bg-white border-gray-100'}`}>
                                <SearchIcon className={`w-8 h-8 mb-3 ${mutedText}`} />
                                <p className={`font-medium text-sm ${bodyText}`}>Hech narsa topilmadi</p>
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
                                        onPreview={() => setPreviewDoc(doc)}
                                        onEdit={() => { setEditDoc(doc); setEditName(doc.name); setEditDesc(doc.description); }}
                                        onDelete={() => setDeleteConfirm(doc)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── Upload name modal ────────────────────────────────────────── */}
            {uploadModal && (
                <Modal isDark={isDark} onClose={() => { setUploadModal(false); setPendingFiles([]); }}>
                    <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {pendingFiles.length} ta fayl yuklash
                    </h3>
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {pendingFiles.map((f, i) => (
                            <div key={i}>
                                <p className={`text-[11px] font-semibold mb-1 ${mutedText}`}>{f.name} · {formatBytes(f.size)}</p>
                                <input
                                    type="text"
                                    value={pendingNames[i]}
                                    onChange={e => setPendingNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                                    placeholder="Fayl nomi…"
                                    className={`w-full px-3 py-2 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]' : 'bg-gray-50 border-gray-200 text-black focus:border-[#0f766e]'}`}
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={() => { setUploadModal(false); setPendingFiles([]); }}
                            className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                        >
                            Bekor qilish
                        </button>
                        <button
                            onClick={confirmUpload}
                            className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-colors"
                        >
                            Yuklash
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Preview modal ────────────────────────────────────────────── */}
            {previewDoc && (
                <Modal isDark={isDark} onClose={() => setPreviewDoc(null)} wide>
                    <div className="flex items-start justify-between mb-4 gap-3">
                        <div className="min-w-0">
                            <p className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{previewDoc.name}</p>
                            <p className={`text-[12px] mt-0.5 ${mutedText}`}>{previewDoc.original_name} · {formatBytes(previewDoc.file_size)}</p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <a
                                href={previewDoc.file_url}
                                download={previewDoc.original_name}
                                target="_blank"
                                rel="noreferrer"
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.08] text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <DownloadIcon className="w-4 h-4" />
                            </a>
                            <button
                                onClick={() => copyUrl(previewDoc.file_url)}
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.08] text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                                title="URL nusxalash"
                            >
                                <CopyIcon className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setPreviewDoc(null)}
                                className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-white/[0.08] text-white/60 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Preview content */}
                    <div className={`rounded-xl overflow-hidden flex items-center justify-center min-h-48 ${isDark ? 'bg-black/40' : 'bg-gray-50'}`}>
                        {getCategory(previewDoc.file_type) === 'image' ? (
                            <img src={previewDoc.file_url} alt={previewDoc.name} className="max-w-full max-h-[60vh] object-contain rounded-xl" />
                        ) : getCategory(previewDoc.file_type) === 'pdf' ? (
                            <iframe src={previewDoc.file_url} title={previewDoc.name} className="w-full h-[60vh] rounded-xl border-0" />
                        ) : getCategory(previewDoc.file_type) === 'video' ? (
                            <video src={previewDoc.file_url} controls className="max-w-full max-h-[60vh] rounded-xl" />
                        ) : (
                            <div className="flex flex-col items-center gap-4 py-12">
                                <FileIcon className={`w-16 h-16 ${mutedText}`} />
                                <a
                                    href={previewDoc.file_url}
                                    download={previewDoc.original_name}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0f766e] text-white text-sm font-semibold hover:bg-[#0a5c56] transition-colors"
                                >
                                    <DownloadIcon className="w-4 h-4" /> Yuklab olish
                                </a>
                            </div>
                        )}
                    </div>
                    {previewDoc.description && (
                        <p className={`mt-3 text-[13px] ${bodyText}`}>{previewDoc.description}</p>
                    )}
                </Modal>
            )}

            {/* ── Edit name modal ──────────────────────────────────────────── */}
            {editDoc && (
                <Modal isDark={isDark} onClose={() => setEditDoc(null)}>
                    <h3 className={`text-base font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Nomni tahrirlash</h3>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Fayl nomi"
                            className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors ${isDark ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]' : 'bg-gray-50 border-gray-200 text-black focus:border-[#0f766e]'}`}
                        />
                        <textarea
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder="Tavsif (ixtiyoriy)"
                            rows={3}
                            className={`w-full px-3 py-2.5 rounded-xl border text-[13px] outline-none transition-colors resize-none ${isDark ? 'bg-surface-2 border-white/[0.08] text-white placeholder-white/30 focus:border-[#0d9488]' : 'bg-gray-50 border-gray-200 text-black focus:border-[#0f766e]'}`}
                        />
                    </div>
                    <div className="flex gap-2 mt-5">
                        <button onClick={() => setEditDoc(null)} className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                            Bekor
                        </button>
                        <button onClick={handleEditSave} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-[#0f766e] hover:bg-[#0a5c56] text-white transition-colors">
                            Saqlash
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Delete confirm modal ─────────────────────────────────────── */}
            {deleteConfirm && (
                <Modal isDark={isDark} onClose={() => setDeleteConfirm(null)}>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>
                        <TrashIcon className="w-6 h-6 text-red-500" />
                    </div>
                    <h3 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Faylni o'chirish</h3>
                    <p className={`text-[13px] mb-5 ${mutedText}`}>
                        "<span className="font-semibold">{deleteConfirm.name}</span>" o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.
                    </p>
                    <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirm(null)} className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold ${isDark ? 'bg-white/[0.06] hover:bg-white/[0.10] text-white/70' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>
                            Bekor
                        </button>
                        <button onClick={handleDeleteConfirmed} className="flex-1 py-2.5 rounded-xl text-[14px] font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors">
                            O'chirish
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

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
    const cat = getCategory(doc.file_type);
    const dateStr = new Date(doc.created_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });

    return (
        <div className={`group relative rounded-2xl border overflow-hidden cursor-pointer transition-all duration-200 ${card}`}>
            {/* Thumbnail / icon area */}
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
                ) : cat === 'video' ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileVideoIcon className="w-10 h-10 text-purple-400" />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-purple-400/70' : 'text-purple-400'}`}>VIDEO</span>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <FileIcon className={`w-10 h-10 ${isDark ? 'text-white/25' : 'text-gray-300'}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                            {doc.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                        </span>
                    </div>
                )}

                {/* Hover action overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                        onClick={e => { e.stopPropagation(); onEdit(); }}
                        className="p-2 rounded-xl bg-white/90 text-gray-700 hover:bg-white transition-colors shadow-sm"
                        title="Nomni tahrirlash"
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
                        title="Yuklab olish"
                    >
                        <DownloadIcon className="w-3.5 h-3.5" />
                    </a>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="p-2 rounded-xl bg-red-500/90 text-white hover:bg-red-600 transition-colors shadow-sm"
                        title="O'chirish"
                    >
                        <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Info row */}
            <div className="px-3 py-2.5" onClick={onPreview}>
                <p className={`text-[13px] font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{doc.name}</p>
                <p className={`text-[11px] mt-0.5 ${mutedText}`}>{formatBytes(doc.file_size)} · {dateStr}</p>
            </div>
        </div>
    );
}

// ─── Reusable Modal ────────────────────────────────────────────────────────────

function Modal({ children, isDark, onClose, wide }: { children: React.ReactNode; isDark: boolean; onClose: () => void; wide?: boolean }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div
                className={`relative w-full rounded-2xl shadow-2xl p-5 ${wide ? 'max-w-2xl' : 'max-w-md'} ${isDark ? 'border border-white/[0.10]' : 'border border-gray-200'}`}
                style={{ background: isDark ? 'hsl(222, 44%, 6%)' : '#ffffff' }}
            >
                {children}
            </div>
        </div>
    );
}

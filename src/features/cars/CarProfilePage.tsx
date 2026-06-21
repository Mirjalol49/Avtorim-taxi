import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../supabase';
import { Car, CarDocument } from '../../core/types/car.types';
import { Driver } from '../../core/types/driver.types';
import { ChevronLeftIcon, EditIcon, TrashIcon, CameraIcon, DownloadIcon, EyeIcon, FilePdfIcon, PlusIcon, UploadCloudIcon, XIcon, UserIcon } from '../../../components/Icons';
import { CalendarDays, ClipboardCheck, ShieldCheck, Wrench as WrenchIcon } from 'lucide-react';
import { forceDownload } from '../../../utils/downloadHelper';
import CarDamageTab from './components/CarDamageTab';
import ConfirmModal from '../../../components/ConfirmModal';
import { LicensePlate } from '../../components/ui/LicensePlate';
import DatePicker from '../../../components/DatePicker';
import QuickAssignmentModal from '../../../components/QuickAssignmentModal';
import { dataUrlToBlobUrl, isPdfSource, openDocumentInNewTab } from '../documents/pdfPreviewUtils';

interface Props {
    cars: Car[];
    drivers: Driver[];
    theme: 'light' | 'dark';
    userRole: 'admin' | 'viewer';
    adminName?: string;
    onEditCar?: (car: Car) => void;
    onDeleteCar?: (id: string) => void;
    onSaveCar?: (car: Car) => void | Promise<void>;
    onQuickAssign?: (payload: { driverId: string; carId: string | null; effectiveFrom?: number; replaceExisting?: boolean }) => Promise<void>;
}

const fmt = (n: number) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(n))} UZS`;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DOC_MB = 5;

type ExpiryStatus = 'missing' | 'expired' | 'soon' | 'valid';
type CarDocumentPreview = {
    name: string;
    data: string;
    type?: string;
};

const DOC_CATEGORIES: Array<{ category: CarDocument['category']; labelKey: string; fallback: string }> = [
    { category: 'id_card', labelKey: 'carDocVehicleRegistration', fallback: 'Avtomobil texpassporti' },
    { category: 'insurance', labelKey: 'carDocInsurance', fallback: "Sug'urta polisi" },
    { category: 'technical_passport', labelKey: 'carDocTechnicalPassport', fallback: "Texnik ko'rik" },
    { category: 'other', labelKey: 'carDocOther', fallback: 'Boshqa hujjat' },
];

const CAR_PROFILE_COPY = {
    uz: {
        documentExpiryTitle: 'Hujjatlar muddati',
        documentExpiryDescription: "Sug'urta, texnik ko'rik va tanirovka sanalari nazorati",
        notSpecified: 'Kiritilmagan',
        validDocument: 'Amalda',
        carDocumentsTitle: 'Hujjatlar',
        carDocumentsCount: '{{count}} ta fayl yuklangan',
        carDocumentsFileCount: '{{count}} ta fayl',
        carDocumentsEmptyTitle: 'Hujjatlar yuklanmagan',
        carDocumentsEmptyText: "Texpassport, sug'urta yoki boshqa fayllarni shu yerdan qo'shing.",
        carDocumentsEmptyHint: "Fayllarni to'g'ridan-to'g'ri shu sahifadan qo'shish mumkin",
        carDocumentUploadTooLarge: 'Fayl hajmi {{max}}MB dan oshmasligi kerak',
        carDocumentSomeFilesSkipped: "{{count}} ta fayl {{max}}MB dan oshdi va o'tkazib yuborildi",
        carDocumentUploadFailed: 'Hujjat yuklashda xatolik yuz berdi',
    },
    ru: {
        documentExpiryTitle: 'Сроки документов',
        documentExpiryDescription: 'Контроль страховки, техосмотра и тонировки',
        notSpecified: 'Не указано',
        validDocument: 'Действует',
        carDocumentsTitle: 'Документы',
        carDocumentsCount: 'Загружено файлов: {{count}}',
        carDocumentsFileCount: '{{count}} файл(ов)',
        carDocumentsEmptyTitle: 'Документы не загружены',
        carDocumentsEmptyText: 'Добавьте техпаспорт, страховку или другие файлы прямо здесь.',
        carDocumentsEmptyHint: 'Файлы можно добавить прямо с этой страницы',
        carDocumentUploadTooLarge: 'Размер файла не должен превышать {{max}}MB',
        carDocumentSomeFilesSkipped: '{{count}} файл(ов) больше {{max}}MB и пропущены',
        carDocumentUploadFailed: 'Ошибка загрузки документа',
    },
    en: {
        documentExpiryTitle: 'Document expiry',
        documentExpiryDescription: 'Insurance, inspection, and tinting date tracking',
        notSpecified: 'Not set',
        validDocument: 'Valid',
        carDocumentsTitle: 'Documents',
        carDocumentsCount: '{{count}} files uploaded',
        carDocumentsFileCount: '{{count}} files',
        carDocumentsEmptyTitle: 'No documents uploaded',
        carDocumentsEmptyText: 'Add vehicle registration, insurance, or other files directly here.',
        carDocumentsEmptyHint: 'Files can be added directly from this page',
        carDocumentUploadTooLarge: 'File size must not exceed {{max}}MB',
        carDocumentSomeFilesSkipped: '{{count}} files exceeded {{max}}MB and were skipped',
        carDocumentUploadFailed: 'Document upload failed',
    },
} as const;

function isImageDocument(doc: { type?: string; data?: string }) {
    return Boolean(doc.type?.startsWith('image/') || doc.data?.startsWith('data:image/'));
}

function isPdfDocument(doc: { name?: string; type?: string; data?: string }) {
    return isPdfSource(doc);
}

function startOfLocalDay(ms: number): number {
    const date = new Date(ms);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

function getExpiryStatus(ms?: number): { status: ExpiryStatus; daysLeft?: number } {
    if (!ms) return { status: 'missing' };
    const today = startOfLocalDay(Date.now());
    const expiryDay = startOfLocalDay(ms);
    const daysLeft = Math.ceil((expiryDay - today) / DAY_MS);

    if (daysLeft < 0) return { status: 'expired', daysLeft };
    if (daysLeft <= 3) return { status: 'soon', daysLeft };
    return { status: 'valid', daysLeft };
}

function readCarDocuments(files: File[], category: CarDocument['category']): Promise<CarDocument[]> {
    return Promise.all(
        files.map(
            file => new Promise<CarDocument>((resolve, reject) => {
                const reader = new FileReader();
                reader.onerror = () => reject(reader.error);
                reader.onloadend = () => {
                    resolve({
                        name: file.name,
                        type: file.type || 'application/octet-stream',
                        data: reader.result as string,
                        category,
                    });
                };
                reader.readAsDataURL(file);
            }),
        ),
    );
}

export const CarProfilePage: React.FC<Props> = ({
    cars, drivers, theme, userRole, adminName, onEditCar, onDeleteCar, onSaveCar, onQuickAssign
}) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const isDark = theme === 'dark';
    
    const car = cars.find(c => c.id === id);
    const driver = car ? drivers.find(d => d.id === car.assignedDriverId && !d.isDeleted) : undefined;
    
    const [viewingDoc, setViewingDoc] = useState<CarDocumentPreview | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [repairConfirm, setRepairConfirm] = useState<{ isOpen: boolean; targetStatus: boolean }>({ isOpen: false, targetStatus: false });
    const [profileDocs, setProfileDocs] = useState<CarDocument[]>([]);
    const [docError, setDocError] = useState<string | null>(null);
    const [savingDocCategory, setSavingDocCategory] = useState<CarDocument['category'] | null>(null);
    const [assignOpen, setAssignOpen] = useState(false);
    const [expiryEditor, setExpiryEditor] = useState<null | 'insurance' | 'technical' | 'tinting' | 'all'>(null);
    const [expiryDrafts, setExpiryDrafts] = useState({
        insurance: null as Date | null,
        technical: null as Date | null,
        tinting: null as Date | null,
    });
    const [expirySaving, setExpirySaving] = useState(false);
    const [expiryError, setExpiryError] = useState<string | null>(null);

    useEffect(() => {
        if (!car?.id) {
            setProfileDocs([]);
            return;
        }

        let cancelled = false;
        const fetchDocuments = async () => {
            const { data, error } = await supabase.from('cars').select('documents').eq('id', car.id).single();
            if (cancelled) return;
            if (!error && Array.isArray(data?.documents)) {
                setProfileDocs(data.documents);
            } else {
                setProfileDocs(car.documents || []);
            }
        };

        setProfileDocs(car.documents || []);
        void fetchDocuments();

        const channel = supabase
            .channel(`car_documents_${car.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'cars', filter: `id=eq.${car.id}` },
                () => { void fetchDocuments(); },
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [car?.id]);

    useEffect(() => {
        if (!viewingDoc) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setViewingDoc(null);
        };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = '';
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [viewingDoc]);

    useEffect(() => {
        if (!viewingDoc) {
            setPreviewUrl(null);
            return;
        }

        let objectUrl: string | null = null;
        if (viewingDoc.data.startsWith('data:') && isPdfDocument(viewingDoc)) {
            try {
                objectUrl = dataUrlToBlobUrl(viewingDoc.data, 'application/pdf');
                setPreviewUrl(objectUrl);
            } catch (error) {
                console.error('Failed to prepare PDF preview', error);
                setPreviewUrl(viewingDoc.data);
            }
        } else {
            setPreviewUrl(viewingDoc.data);
        }

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [viewingDoc]);

    if (!car) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full">
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Avtomobil topilmadi</p>
                <button onClick={() => navigate('/cars')} className="mt-4 px-4 py-2 bg-[#0f766e] text-white rounded-xl font-bold">Ortga qaytish</button>
            </div>
        );
    }

    const docs = profileDocs;
    const canManageDocuments = userRole === 'admin' && !!onSaveCar;
    const bg = isDark ? 'bg-surface border-white/[0.07]' : 'bg-white border-gray-200';
    const bdr = isDark ? 'border-white/[0.07]' : 'border-gray-200';
    const txt = isDark ? 'text-white' : 'text-gray-900';
    const muted = isDark ? 'text-white/40' : 'text-gray-500';
    const isAssigned = !!driver;
    const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'en' ? 'en-US' : 'uz-UZ';
    const copyLang = i18n.language === 'ru' ? 'ru' : i18n.language === 'en' ? 'en' : 'uz';
    const carCopy = CAR_PROFILE_COPY[copyLang];
    const tr = (key: keyof typeof carCopy, options?: Record<string, unknown>) =>
        t(key, { defaultValue: carCopy[key], ...options });
    const isViewingImage = viewingDoc ? isImageDocument(viewingDoc) : false;
    const isViewingPdf = viewingDoc ? isPdfDocument(viewingDoc) : false;
    const expiryItems = [
        { key: 'insurance', label: t('insuranceOsago'), value: car.insuranceExpiryMs, icon: ShieldCheck },
        { key: 'technical', label: t('technicalInspection'), value: car.techInspectionExpiryMs, icon: ClipboardCheck },
        { key: 'tinting', label: t('tinting'), value: car.tintingExpiryMs, icon: CalendarDays },
    ];
    const docGroups = DOC_CATEGORIES
        .map(item => ({
            ...item,
            label: t(item.labelKey, item.fallback),
            docs: docs.filter(doc => doc.category === item.category),
        }))
        .filter(group => group.docs.length > 0);

    const formatExpiryDate = (ms?: number) => {
        if (!ms) return tr('notSpecified');
        return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ms));
    };

    const getStatusLabel = (status: ExpiryStatus, daysLeft?: number) => {
        if (status === 'missing') return tr('notSpecified');
        if (status === 'expired') return t('expired');
        if (status === 'soon') {
            if (daysLeft === 0) return t('today');
            return t('daysLeft', { count: daysLeft });
        }
        return tr('validDocument');
    };

    const getStatusClasses = (status: ExpiryStatus) => {
        if (status === 'expired') {
            return isDark
                ? 'border-red-500/25 bg-red-500/10 text-red-300'
                : 'border-red-200 bg-red-50 text-red-600';
        }
        if (status === 'soon') {
            return isDark
                ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                : 'border-amber-200 bg-amber-50 text-amber-700';
        }
        if (status === 'valid') {
            return isDark
                ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700';
        }
        return isDark
            ? 'border-white/[0.08] bg-white/[0.03] text-white/45'
            : 'border-gray-200 bg-gray-50 text-gray-500';
    };

    const handleProfileDocUpload = async (
        e: React.ChangeEvent<HTMLInputElement>,
        category: CarDocument['category'],
    ) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length || !onSaveCar) return;

        const oversizedCount = files.filter(file => file.size > MAX_DOC_MB * 1024 * 1024).length;
        const acceptedFiles = files.filter(file => file.size <= MAX_DOC_MB * 1024 * 1024);
        if (!acceptedFiles.length) {
            setDocError(tr('carDocumentUploadTooLarge', { max: MAX_DOC_MB }));
            return;
        }

        setSavingDocCategory(category);
        setDocError(oversizedCount > 0 ? tr('carDocumentSomeFilesSkipped', { count: oversizedCount, max: MAX_DOC_MB }) : null);

        try {
            const newDocs = await readCarDocuments(acceptedFiles, category);
            const nextDocs = [...docs, ...newDocs];
            setProfileDocs(nextDocs);
            onSaveCar({ ...car, documents: nextDocs });
        } catch {
            setDocError(tr('carDocumentUploadFailed'));
        } finally {
            setSavingDocCategory(null);
        }
    };

    const openExpiryEditor = (key: 'insurance' | 'technical' | 'tinting' | 'all') => {
        if (userRole !== 'admin') return;
        setExpiryDrafts({
            insurance: car.insuranceExpiryMs ? new Date(car.insuranceExpiryMs) : null,
            technical: car.techInspectionExpiryMs ? new Date(car.techInspectionExpiryMs) : null,
            tinting: car.tintingExpiryMs ? new Date(car.tintingExpiryMs) : null,
        });
        setExpiryError(null);
        setExpiryEditor(key);
    };

    const saveExpiryDates = async () => {
        if (!onSaveCar) return;
        setExpirySaving(true);
        setExpiryError(null);
        try {
            await onSaveCar({
                ...car,
                insuranceExpiryMs: (expiryDrafts.insurance?.getTime() ?? null) as any,
                techInspectionExpiryMs: (expiryDrafts.technical?.getTime() ?? null) as any,
                tintingExpiryMs: (expiryDrafts.tinting?.getTime() ?? null) as any,
            } as Car);
            setExpiryEditor(null);
        } catch (err: any) {
            setExpiryError(err?.message || t('errorOccurred', 'Xatolik yuz berdi'));
        } finally {
            setExpirySaving(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            {/* Header Area */}
            <div className={`relative overflow-hidden rounded-3xl border shadow-sm ${bg} h-64 md:h-72`}>
                {car.avatar ? (
                    <img src={car.avatar} alt={car.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 ${isDark ? 'bg-[#0d1829]' : 'bg-slate-100'}`}>
                        <CameraIcon className={`w-12 h-12 ${isDark ? 'text-white/10' : 'text-slate-300'}`} />
                        <span className={`text-sm font-semibold ${isDark ? 'text-white/20' : 'text-slate-400'}`}>Rasm yo'q</span>
                    </div>
                )}
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40" />

                {/* Top Bar Navigation & Controls */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                    <button 
                        onClick={() => navigate('/cars')}
                        className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition-colors border border-white/20"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>

                    {userRole === 'admin' && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => onEditCar?.(car)}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-colors border border-white/20"
                                title="Tahrirlash"
                            >
                                <EditIcon className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => {
                                    if (window.confirm("Rostdan ham bu avtomobilni o'chirmoqchimisiz?")) {
                                        onDeleteCar?.(car.id);
                                        navigate('/cars');
                                    }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-500/30 hover:bg-red-500/50 backdrop-blur-md text-red-100 transition-colors border border-red-500/40"
                                title="O'chirish"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Bottom Left Info */}
                <div className="absolute bottom-5 left-5 right-5 md:bottom-6 md:left-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight drop-shadow-lg leading-none mb-3">
                            {car.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <div>
                                <LicensePlate plate={car.licensePlate} size="md" />
                            </div>
                            
                            {/* Badges */}
                            {car.inRepair ? (
                                <button
                                    onClick={() => {
                                        if (userRole === 'admin') setRepairConfirm({ isOpen: true, targetStatus: false });
                                    }}
                                    disabled={userRole !== 'admin'}
                                    className={`px-3 py-1.5 rounded-xl bg-red-500/90 hover:bg-red-500 active:scale-95 transition-all backdrop-blur-md border border-red-400 text-white text-[12px] font-bold shadow-sm flex items-center gap-2 ${userRole !== 'admin' ? 'cursor-default active:scale-100' : ''}`}
                                >
                                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                    Ta'mirda
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (userRole === 'admin') setRepairConfirm({ isOpen: true, targetStatus: true });
                                    }}
                                    disabled={userRole !== 'admin'}
                                    className={`px-3 py-1.5 rounded-xl transition-all active:scale-95 text-[12px] font-bold flex items-center gap-1.5 shadow-sm border ${
                                        isDark ? 'bg-black/50 hover:bg-black/70 border-white/20 text-gray-200 backdrop-blur-md' : 'bg-white/90 hover:bg-white border-white/50 text-gray-800 backdrop-blur-md'
                                    } ${userRole !== 'admin' ? 'cursor-default active:scale-100 hidden' : ''}`}
                                >
                                    <WrenchIcon className="w-3.5 h-3.5" />
                                    Ta'mirga yuborish
                                </button>
                            )}

                            {!isAssigned && !car.inRepair && (
                                <span className="px-3 py-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/20 text-white text-[12px] font-bold shadow-sm">
                                    Bo'sh avtomobil
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Grid Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Plan & Driver & Docs */}
                <div className="space-y-6 lg:col-span-1">
                    
                    {/* Kunlik Reja */}
                    <div className={`p-6 rounded-3xl border shadow-sm ${isDark ? 'border-teal-500/30 bg-teal-500/[0.04]' : 'border-teal-200 bg-teal-50'}`}>
                        <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-teal-500/80' : 'text-teal-700/80'}`}>Kunlik Reja</p>
                        {car.dailyPlan && car.dailyPlan > 0 ? (
                            <p className={`text-[36px] font-black font-mono leading-none tracking-tight ${isDark ? 'text-teal-400' : 'text-teal-700'}`}>
                                {fmt(car.dailyPlan)}
                            </p>
                        ) : (
                            <p className={`text-[24px] font-bold ${isDark ? 'text-teal-400/50' : 'text-teal-600/50'}`}>Belgilanmagan</p>
                        )}
                    </div>

                    {/* Assigned Driver */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <p className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>👤 Haydovchi</p>
                            {userRole === 'admin' && onQuickAssign && (
                                <button
                                    type="button"
                                    onClick={() => setAssignOpen(true)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-colors ${isDark ? 'border-teal-500/25 text-teal-300 hover:bg-teal-500/10' : 'border-teal-200 text-teal-700 hover:bg-teal-50'}`}
                                >
                                    {isAssigned ? t('quickAssignChange', 'Almashtirish') : t('assignDriver', 'Biriktirish')}
                                </button>
                            )}
                        </div>
                        {isAssigned ? (
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border ${bdr}`}>
                                    {driver!.avatar ? (
                                        <img src={driver!.avatar} alt={driver!.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className={`w-full h-full flex items-center justify-center font-bold text-[18px] ${isDark ? 'bg-surface-2 text-white/50' : 'bg-gray-100 text-gray-400'}`}>
                                            {driver!.name.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-[16px] font-bold truncate ${txt}`}>{driver!.name}</p>
                                    <p className={`text-[13px] font-medium font-mono mt-0.5 ${muted}`}>{driver!.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <div className={`py-4 flex flex-col items-center justify-center text-center ${muted}`}>
                                <UserIcon className="w-9 h-9 mb-2 opacity-45" />
                                <p className="text-[14px] font-bold">Hech kim biriktirilmagan</p>
                                {userRole === 'admin' && onQuickAssign && (
                                    <button
                                        type="button"
                                        onClick={() => setAssignOpen(true)}
                                        className="mt-4 h-10 px-5 rounded-2xl bg-[#0f766e] text-white text-[13px] font-black hover:bg-[#0b5f59] transition-colors"
                                    >
                                        {t('assignDriver', 'Haydovchi biriktirish')}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Document Expiry */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <p className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>
                                    {tr('documentExpiryTitle')}
                                </p>
                                <p className={`text-[13px] mt-1 leading-snug ${muted}`}>
                                    {tr('documentExpiryDescription')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => openExpiryEditor('all')}
                                disabled={userRole !== 'admin'}
                                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                                    isDark ? 'bg-teal-500/10 text-teal-300 hover:bg-teal-500/20' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                } ${userRole !== 'admin' ? 'cursor-default' : ''}`}
                                aria-label={t('editDocumentExpiry', 'Hujjat muddatlarini sozlash')}
                                title={t('editDocumentExpiry', 'Hujjat muddatlarini sozlash')}
                            >
                                <CalendarDays className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {expiryItems.map((item) => {
                                const Icon = item.icon;
                                const meta = getExpiryStatus(item.value);
                                return (
                                    <button
                                        type="button"
                                        key={item.key}
                                        onClick={() => openExpiryEditor(item.key as 'insurance' | 'technical' | 'tinting')}
                                        disabled={userRole !== 'admin'}
                                        className={`w-full text-left rounded-2xl border p-4 transition-all ${userRole === 'admin' ? 'active:scale-[0.99]' : 'cursor-default'} ${getStatusClasses(meta.status)}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-black/15 flex items-center justify-center shrink-0">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="text-[13px] font-black uppercase tracking-wide leading-tight">
                                                        {item.label}
                                                    </p>
                                                    <span className="shrink-0 text-[11px] font-black uppercase tracking-wide opacity-80">
                                                        {getStatusLabel(meta.status, meta.daysLeft)}
                                                    </span>
                                                </div>
                                                <p className={`mt-1 text-[18px] font-black tabular-nums leading-tight ${
                                                    meta.status === 'missing' ? 'opacity-55' : ''
                                                }`}>
                                                    {formatExpiryDate(item.value)}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Documents */}
                    <div className={`p-5 rounded-3xl border ${bg}`}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <p className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>
                                    {tr('carDocumentsTitle')}
                                </p>
                                <p className={`text-[13px] mt-1 ${muted}`}>
                                    {docs.length > 0 ? tr('carDocumentsCount', { count: docs.length }) : tr('carDocumentsEmptyHint')}
                                </p>
                            </div>
                            {canManageDocuments && (
                                <label
                                    htmlFor="car-profile-doc-other"
                                    className={`h-10 px-3.5 rounded-2xl inline-flex items-center gap-2 text-[13px] font-black shrink-0 cursor-pointer transition-colors ${
                                        isDark ? 'bg-teal-500/15 text-teal-200 hover:bg-teal-500/25' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                    }`}
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    {t('add')}
                                </label>
                            )}
                        </div>

                        {docError && (
                            <div className={`mb-4 rounded-2xl border px-3 py-2 text-[12px] font-semibold ${
                                isDark ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'
                            }`}>
                                {docError}
                            </div>
                        )}

                        {canManageDocuments && (
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {DOC_CATEGORIES.map(item => (
                                    <label
                                        key={item.category}
                                        htmlFor={`car-profile-doc-${item.category}`}
                                        className={`min-h-[44px] rounded-2xl border px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                                            isDark
                                                ? 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] text-white/75'
                                                : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                                        }`}
                                    >
                                        <span className="min-w-0 text-[12px] font-bold leading-tight">
                                            {t(item.labelKey, item.fallback)}
                                        </span>
                                        {savingDocCategory === item.category ? (
                                            <span className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0 ${isDark ? 'border-teal-300' : 'border-teal-600'}`} />
                                        ) : (
                                            <UploadCloudIcon className="w-4 h-4 shrink-0 opacity-70" />
                                        )}
                                        <input
                                            id={`car-profile-doc-${item.category}`}
                                            type="file"
                                            accept="image/*,application/pdf"
                                            multiple
                                            className="hidden"
                                            disabled={!!savingDocCategory}
                                            onChange={e => handleProfileDocUpload(e, item.category)}
                                        />
                                    </label>
                                ))}
                            </div>
                        )}

                        {docGroups.length > 0 ? (
                            <div className="space-y-3">
                                {docGroups.map(group => (
                                    <div
                                        key={group.category}
                                        className={`rounded-2xl border p-3.5 ${
                                            isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-200 bg-slate-50/70'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-3">
                                            <p className={`text-[14px] font-black ${txt}`}>{group.label}</p>
                                            <span className={`text-[11px] font-bold ${muted}`}>
                                                {tr('carDocumentsFileCount', { count: group.docs.length })}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                                            {group.docs.map((doc, idx) => {
                                                const isImage = isImageDocument(doc);
                                                const isPdf = isPdfDocument(doc);
                                                const fileNumber = idx + 1;
                                                const openDocument = () => {
                                                    if (isPdf) {
                                                        openDocumentInNewTab(doc.data);
                                                        return;
                                                    }
                                                    setViewingDoc({ name: doc.name || group.label, data: doc.data, type: doc.type });
                                                };
                                                return (
                                                    <div key={`${doc.name}-${idx}`} className="relative group">
                                                        <button
                                                            type="button"
                                                            onClick={openDocument}
                                                            className={`relative w-full aspect-square overflow-hidden rounded-2xl border flex items-center justify-center ${
                                                                isDark ? 'border-white/[0.10] bg-black/15' : 'border-slate-200 bg-white'
                                                            }`}
                                                            title={doc.name}
                                                            aria-label={`${t('view', "Ko'rish")}: ${doc.name || group.label}`}
                                                        >
                                                            {isImage ? (
                                                                <img src={doc.data} alt={doc.name} className="absolute inset-0 w-full h-full object-cover" />
                                                            ) : isPdf ? (
                                                                <div className="flex flex-col items-center gap-1.5 pt-2 text-rose-500">
                                                                    <FilePdfIcon className="w-8 h-8" />
                                                                    <span className="text-[10px] font-black tracking-wider">PDF</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-1.5 px-2 pt-2 text-slate-500">
                                                                    <FilePdfIcon className="w-8 h-8" />
                                                                    <span className="max-w-full truncate text-[10px] font-black tracking-wider">{doc.type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                                                                </div>
                                                            )}
                                                            <span className="absolute left-1.5 top-1.5 min-w-6 h-6 px-1 rounded-full bg-black/70 text-white text-[11px] font-black flex items-center justify-center">
                                                                {fileNumber}
                                                            </span>
                                                            <span className="absolute right-1.5 bottom-1.5 w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center opacity-90 group-hover:scale-105 transition-transform">
                                                                <EyeIcon className="w-3.5 h-3.5" />
                                                            </span>
                                                        </button>
                                                        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={openDocument}
                                                                className={`h-8 rounded-xl flex items-center justify-center transition-all active:scale-[0.97] ${
                                                                    isDark ? 'bg-white/[0.06] text-white/75 hover:bg-white/[0.1]' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                                aria-label={`${t('view', "Ko'rish")}: ${doc.name || group.label}`}
                                                                title={t('view', "Ko'rish")}
                                                            >
                                                                <EyeIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => forceDownload(doc.data, doc.name)}
                                                                className={`h-8 rounded-xl flex items-center justify-center transition-all active:scale-[0.97] ${
                                                                    isDark ? 'bg-teal-500/15 text-teal-200 hover:bg-teal-500/25' : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                                                                }`}
                                                                aria-label={`${t('download', 'Yuklab olish')}: ${doc.name || group.label}`}
                                                                title={t('download', 'Yuklab olish')}
                                                            >
                                                                <DownloadIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={`rounded-3xl border border-dashed py-8 px-4 flex flex-col items-center justify-center text-center ${
                                isDark ? 'border-white/[0.10] bg-white/[0.02]' : 'border-slate-200 bg-slate-50/60'
                            }`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                                    isDark ? 'bg-white/[0.04] text-white/25' : 'bg-white text-slate-300'
                                }`}>
                                    <UploadCloudIcon className="w-7 h-7" />
                                </div>
                                <p className={`text-[15px] font-black ${txt}`}>{tr('carDocumentsEmptyTitle')}</p>
                                <p className={`text-[13px] mt-1 max-w-[260px] ${muted}`}>{tr('carDocumentsEmptyText')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Damages (Shikastlar) */}
                <div className="lg:col-span-2">
                    <div className={`rounded-3xl border overflow-hidden flex flex-col h-full ${bg}`}>
                        <div className={`px-5 py-4 border-b ${bdr} ${isDark ? 'bg-surface-2/50' : 'bg-gray-50'}`}>
                            <p className={`text-[12px] font-black uppercase tracking-wider ${muted}`}>🔧 Avtomobil shikastlari (Damages)</p>
                        </div>
                        <div className="flex-1 p-5">
                            <CarDamageTab
                                car={car}
                                isDark={isDark}
                                userRole={userRole}
                                adminName={adminName || 'Admin'}
                                onUpdated={(updatedDamage) => {
                                    if (onSaveCar) onSaveCar({ ...car, damage: updatedDamage });
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {viewingDoc && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('viewDocument', "Hujjatni ko'rish")}
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md"
                    onMouseDown={() => setViewingDoc(null)}
                >
                    <div
                        className={`relative flex w-full max-w-[920px] h-[min(820px,calc(100dvh-32px))] sm:h-[min(860px,calc(100dvh-48px))] flex-col overflow-hidden rounded-[28px] border shadow-2xl ${
                            isDark ? 'bg-[#111827] border-white/10' : 'bg-white border-slate-200'
                        }`}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        <div className={`flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <div className="min-w-0">
                                <p className={`text-[15px] sm:text-[16px] font-bold leading-tight truncate ${txt}`}>
                                    {t('viewDocument', "Hujjatni ko'rish")}
                                </p>
                                <p className={`mt-0.5 text-[12px] truncate ${muted}`}>
                                    {viewingDoc.name || t('file', 'Fayl')}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {previewUrl && (
                                    <button
                                        type="button"
                                        onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                                        className={`hidden sm:flex h-10 px-3 items-center justify-center rounded-[16px] border text-[12px] font-bold transition-colors ${
                                            isDark ? 'border-white/10 text-white/75 hover:bg-white/10' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                                        }`}
                                    >
                                        {t('open', 'Ochish')}
                                    </button>
                                )}
                                <button
                                    onClick={() => forceDownload(viewingDoc.data, viewingDoc.name)}
                                    className="h-10 px-3 sm:px-4 rounded-[16px] bg-[#0f766e] text-white text-[12px] font-bold hover:bg-[#0b665f] transition-colors flex items-center justify-center gap-2"
                                >
                                    <DownloadIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{t('download', 'Yuklab olish')}</span>
                                </button>
                                <button
                                    onClick={() => setViewingDoc(null)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-[16px] border transition-colors ${
                                        isDark ? 'border-white/10 text-white/70 hover:bg-white/10 hover:text-white' : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
                                    }`}
                                    aria-label={t('close', 'Yopish')}
                                >
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className={`flex-1 min-h-0 overflow-auto p-3 sm:p-5 flex items-center justify-center ${isDark ? 'bg-black/40' : 'bg-slate-50'}`}>
                            {isViewingImage ? (
                                <img
                                    src={viewingDoc.data}
                                    alt={viewingDoc.name}
                                    className="max-w-full max-h-full rounded-[20px] object-contain shadow-xl"
                                />
                            ) : isViewingPdf && previewUrl ? (
                                <div className={`w-full max-w-sm rounded-[24px] border p-6 text-center ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
                                    <FilePdfIcon className={`mx-auto mb-3 w-12 h-12 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
                                    <p className={`text-[15px] font-black ${txt}`}>{viewingDoc.name || t('file', 'Fayl')}</p>
                                    <p className={`mt-1 text-[12px] ${muted}`}>{t('documentPreviewUnavailable', "Bu faylni brauzerda ko'rib bo'lmadi. Yuklab oling yoki alohida oynada oching.")}</p>
                                    <button
                                        type="button"
                                        onClick={() => openDocumentInNewTab(viewingDoc.data)}
                                        className="mt-4 h-10 px-4 rounded-[16px] bg-[#0f766e] text-white text-[12px] font-bold hover:bg-[#0b665f] transition-colors"
                                    >
                                        {t('open', 'Ochish')}
                                    </button>
                                </div>
                            ) : (
                                <div className={`w-full max-w-sm rounded-[24px] border p-6 text-center ${isDark ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200 bg-white'}`}>
                                    <FilePdfIcon className={`mx-auto mb-3 w-12 h-12 ${isDark ? 'text-white/50' : 'text-slate-400'}`} />
                                    <p className={`text-[15px] font-black ${txt}`}>{viewingDoc.name || t('file', 'Fayl')}</p>
                                    <p className={`mt-1 text-[12px] ${muted}`}>{t('documentPreviewUnavailable', "Bu faylni brauzerda ko'rib bo'lmadi. Yuklab oling yoki alohida oynada oching.")}</p>
                                    {previewUrl && (
                                        <button
                                            type="button"
                                            onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}
                                            className="mt-4 h-10 px-4 rounded-[16px] bg-[#0f766e] text-white text-[12px] font-bold hover:bg-[#0b665f] transition-colors"
                                        >
                                            {t('open', 'Ochish')}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}

            {onQuickAssign && (
                <QuickAssignmentModal
                    isOpen={assignOpen}
                    mode="car"
                    car={car}
                    driver={driver ?? null}
                    drivers={drivers}
                    cars={cars}
                    theme={theme}
                    onClose={() => setAssignOpen(false)}
                    onSave={onQuickAssign}
                />
            )}

            {expiryEditor && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[330] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm" onMouseDown={() => setExpiryEditor(null)}>
                    <div className={`w-full max-w-lg rounded-[28px] border shadow-2xl overflow-hidden ${isDark ? 'bg-[#111827] border-white/[0.08]' : 'bg-white border-slate-200'}`} onMouseDown={e => e.stopPropagation()}>
                        <div className={`px-5 py-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-slate-100'} flex items-start justify-between gap-4`}>
                            <div>
                                <p className={`text-[11px] font-black uppercase tracking-[0.18em] ${muted}`}>{tr('documentExpiryTitle')}</p>
                                <h2 className={`text-xl font-black mt-1 ${txt}`}>
                                    {expiryEditor === 'all'
                                        ? t('editDocumentExpiry', 'Hujjat muddatlarini sozlash')
                                        : expiryItems.find(item => item.key === expiryEditor)?.label}
                                </h2>
                            </div>
                            <button type="button" onClick={() => setExpiryEditor(null)} className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isDark ? 'bg-white/[0.06] text-white/70' : 'bg-slate-100 text-slate-500'}`}>
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {(expiryEditor === 'all' || expiryEditor === 'insurance') && (
                                <DatePicker
                                    label={t('insuranceOsago')}
                                    value={expiryDrafts.insurance}
                                    onChange={(d: Date | null) => setExpiryDrafts(prev => ({ ...prev, insurance: d }))}
                                    isClearable
                                    theme={theme}
                                />
                            )}
                            {(expiryEditor === 'all' || expiryEditor === 'technical') && (
                                <DatePicker
                                    label={t('technicalInspection')}
                                    value={expiryDrafts.technical}
                                    onChange={(d: Date | null) => setExpiryDrafts(prev => ({ ...prev, technical: d }))}
                                    isClearable
                                    theme={theme}
                                />
                            )}
                            {(expiryEditor === 'all' || expiryEditor === 'tinting') && (
                                <DatePicker
                                    label={t('tinting')}
                                    value={expiryDrafts.tinting}
                                    onChange={(d: Date | null) => setExpiryDrafts(prev => ({ ...prev, tinting: d }))}
                                    isClearable
                                    theme={theme}
                                />
                            )}
                            {expiryError && (
                                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                                    {expiryError}
                                </p>
                            )}
                        </div>
                        <div className={`px-5 py-4 border-t ${isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-slate-100 bg-slate-50'} flex justify-between gap-3`}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (expiryEditor === 'all') setExpiryDrafts({ insurance: null, technical: null, tinting: null });
                                    else setExpiryDrafts(prev => ({ ...prev, [expiryEditor]: null }));
                                }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold ${isDark ? 'text-white/65 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'}`}
                            >
                                {t('clear', 'Tozalash')}
                            </button>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setExpiryEditor(null)} className={`px-4 py-2.5 rounded-xl text-sm font-bold ${isDark ? 'text-white/65 hover:bg-white/[0.06]' : 'text-slate-600 hover:bg-slate-100'}`}>
                                    {t('cancel', 'Bekor qilish')}
                                </button>
                                <button type="button" disabled={expirySaving} onClick={saveExpiryDates} className="px-5 py-2.5 rounded-xl text-sm font-black bg-[#0f766e] text-white hover:bg-[#0b5f59] disabled:opacity-60">
                                    {expirySaving ? t('saving', 'Saqlanmoqda...') : t('save', 'Saqlash')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={repairConfirm.isOpen}
                title={repairConfirm.targetStatus ? "Ta'mirga yuborish" : "Ta'mirdan chiqarish"}
                message={repairConfirm.targetStatus ? "Haqiqatan ham avtomobilni ta'mirga yubormoqchimisiz? Haydovchi uchun kunlik reja to'xtatiladi." : "Haqiqatan ham avtomobilni ta'mirdan chiqarmoqchimisiz? Kunlik reja hisoblanishi davom etadi."}
                confirmLabel="Tasdiqlash"
                cancelLabel="Bekor qilish"
                theme={theme}
                isDanger={repairConfirm.targetStatus}
                onConfirm={() => {
                    if (onSaveCar) onSaveCar({ ...car, inRepair: repairConfirm.targetStatus });
                    setRepairConfirm({ isOpen: false, targetStatus: false });
                }}
                onCancel={() => setRepairConfirm({ isOpen: false, targetStatus: false })}
            />
        </div>
    );
};

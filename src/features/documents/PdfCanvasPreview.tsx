import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

interface PdfCanvasPreviewProps {
    src: string;
    title: string;
    isDark?: boolean;
    className?: string;
}

function PdfPageCanvas({ pdf, pageNumber, isDark }: { pdf: PDFDocumentProxy; pageNumber: number; isDark: boolean }) {
    const wrapRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [width, setWidth] = useState(0);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const updateWidth = () => {
            const nextWidth = wrapRef.current?.clientWidth ?? 0;
            setWidth(nextWidth);
        };

        updateWidth();
        if (!wrapRef.current || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', updateWidth);
            return () => window.removeEventListener('resize', updateWidth);
        }

        const observer = new ResizeObserver(updateWidth);
        observer.observe(wrapRef.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!width || !canvasRef.current) return;

        let cancelled = false;
        let renderTask: RenderTask | null = null;

        async function renderPage() {
            try {
                const page = await pdf.getPage(pageNumber);
                if (cancelled || !canvasRef.current) return;

                const baseViewport = page.getViewport({ scale: 1 });
                const scale = Math.min(width / baseViewport.width, 2);
                const viewport = page.getViewport({ scale });
                const outputScale = Math.min(window.devicePixelRatio || 1, 2);
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) throw new Error('Canvas context is not available');

                canvas.width = Math.floor(viewport.width * outputScale);
                canvas.height = Math.floor(viewport.height * outputScale);
                canvas.style.width = `${Math.floor(viewport.width)}px`;
                canvas.style.height = `${Math.floor(viewport.height)}px`;

                renderTask = page.render({
                    canvas,
                    canvasContext: context,
                    viewport,
                    transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
                });
                await renderTask.promise;
                if (!cancelled) setFailed(false);
            } catch (error) {
                if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
                    console.error('Failed to render PDF page', error);
                    setFailed(true);
                }
            }
        }

        renderPage();
        return () => {
            cancelled = true;
            renderTask?.cancel();
        };
    }, [pdf, pageNumber, width]);

    return (
        <div ref={wrapRef} className="w-full flex justify-center">
            {failed ? (
                <div className={`w-full rounded-[18px] border p-5 text-center text-[13px] ${isDark ? 'border-white/10 bg-white/[0.04] text-white/60' : 'border-slate-200 bg-white text-slate-500'}`}>
                    PDF sahifasini ko'rsatib bo'lmadi.
                </div>
            ) : (
                <canvas
                    ref={canvasRef}
                    aria-label={`${pageNumber}`}
                    className={`max-w-full rounded-[18px] shadow-sm ${isDark ? 'bg-white' : 'bg-white'}`}
                />
            )}
        </div>
    );
}

export function PdfCanvasPreview({ src, title, isDark = false, className = '' }: PdfCanvasPreviewProps) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const loadingTask = getDocument({ url: src });

        setPdf(null);
        setFailed(false);

        loadingTask.promise
            .then((loadedPdf) => {
                if (cancelled) {
                    loadingTask.destroy();
                    return;
                }
                setPdf(loadedPdf);
            })
            .catch((error) => {
                if (!cancelled) {
                    console.error('Failed to load PDF preview', error);
                    setFailed(true);
                }
            });

        return () => {
            cancelled = true;
            loadingTask.destroy();
        };
    }, [src]);

    const pages = useMemo(() => (
        pdf ? Array.from({ length: pdf.numPages }, (_, index) => index + 1) : []
    ), [pdf]);

    if (failed) {
        return (
            <div className={`w-full h-full min-h-[360px] flex items-center justify-center ${className}`}>
                <div className={`w-full max-w-sm rounded-[24px] border p-6 text-center ${isDark ? 'border-white/10 bg-white/[0.04] text-white/60' : 'border-slate-200 bg-white text-slate-500'}`}>
                    PDF faylni ko'rsatib bo'lmadi. Ochish yoki yuklab olish tugmasidan foydalaning.
                </div>
            </div>
        );
    }

    if (!pdf) {
        return (
            <div className={`w-full h-full min-h-[360px] flex items-center justify-center ${className}`}>
                <div className="flex flex-col items-center gap-3">
                    <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin ${isDark ? 'border-white/30 border-t-white' : 'border-slate-300 border-t-slate-700'}`} />
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-slate-500'}`}>PDF yuklanmoqda...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`w-full h-full overflow-auto ${className}`} aria-label={title}>
            <div className="mx-auto flex w-full max-w-[940px] flex-col gap-4 p-1 sm:p-2">
                {pages.map(pageNumber => (
                    <PdfPageCanvas key={pageNumber} pdf={pdf} pageNumber={pageNumber} isDark={isDark} />
                ))}
            </div>
        </div>
    );
}

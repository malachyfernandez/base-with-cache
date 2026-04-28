import { generateId } from './generateId';

const TARGET_MIN_DIMENSION = 1080;
const JPEG_QUALITY = 0.82;
const MAX_PAGES = 20;

const canvasToJpegBlob = async (canvas: HTMLCanvasElement) => {
    return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Failed to convert PDF page to JPEG.'));
                    return;
                }

                resolve(blob);
            },
            'image/jpeg',
            JPEG_QUALITY,
        );
    });
};

const getPdfJs = async () => {
    const pdfjs = await import('pdfjs-dist');

    pdfjs.GlobalWorkerOptions.workerSrc =
        `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    return pdfjs;
};

export type RenderedPdfPage = {
    id: string;
    pageNumber: number;
    previewUrl: string;
    file: File;
};

export const renderPdfFileToImages = async (
    file: File,
): Promise<RenderedPdfPage[]> => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        throw new Error('PDF rendering is only available in the browser.');
    }

    const pdfjs = await getPdfJs();
    const data = new Uint8Array(await file.arrayBuffer());
    const pdfDocument = await pdfjs.getDocument({ data }).promise;
    
    if (pdfDocument.numPages > MAX_PAGES) {
        throw new Error(`PDFs are currently limited to ${MAX_PAGES} pages per import. This PDF has ${pdfDocument.numPages} pages.`);
    }

    const pages: RenderedPdfPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
        const pdfPage = await pdfDocument.getPage(pageNumber);
        const baseViewport = pdfPage.getViewport({ scale: 1 });

        const shortestSide = Math.min(baseViewport.width, baseViewport.height);
        const scale = shortestSide > 0
            ? Math.max(1, TARGET_MIN_DIMENSION / shortestSide)
            : 1.5;

        const viewport = pdfPage.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Failed to create canvas context for PDF rendering.');
        }

        await pdfPage.render({
            canvasContext: context,
            viewport,
            canvas,
        }).promise;

        const blob = await canvasToJpegBlob(canvas);
        const fileName = file.name.replace(/\.pdf$/i, '');
        const imageFile = new File(
            [blob],
            `${fileName}-page-${pageNumber}.jpg`,
            {
                type: 'image/jpeg',
                lastModified: Date.now(),
            },
        );

        pages.push({
            id: generateId(),
            pageNumber,
            previewUrl: URL.createObjectURL(blob),
            file: imageFile,
        });
    }

    return pages;
};

export const renderPdfUrlToImages = async (
    url: string,
): Promise<RenderedPdfPage[]> => {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) {
            throw new Error('Failed to fetch PDF from URL.');
        }

        const blob = await response.blob();
        const fileName = url.split('/').pop()?.split('?')[0] || 'document';
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        return await renderPdfFileToImages(file);
    } catch (error) {
        if (error instanceof Error && error.message.includes('CORS')) {
            throw new Error('This PDF URL cannot be accessed by the browser. Please download it and upload the file directly.');
        }
        throw error;
    }
};

export const isPdfUrl = (url: string): boolean => {
    return url.toLowerCase().endsWith('.pdf') || 
           url.toLowerCase().startsWith('data:application/pdf');
};

export const isPdfFile = (file: File): boolean => {
    return file.type === 'application/pdf' || 
           file.name.toLowerCase().endsWith('.pdf');
};

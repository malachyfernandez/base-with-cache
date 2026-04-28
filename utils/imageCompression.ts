import { ImagePickerAsset } from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform } from 'react-native';

export type UploadThingReactNativeFile = {
    uri: string;
    name: string;
    size: number;
    type: string;
    lastModified: number;
    file?: File;
};

const TARGET_MIN_DIMENSION = 1080;
const JPEG_COMPRESS_QUALITY = 0.72;

const ensureJpegFileName = (fileName?: string) => {
    const baseName = fileName?.replace(/\.[^.]+$/, '') || `upload-${Date.now()}`;
    return `${baseName}.jpg`;
};

const getFileSizeFromUri = async (uri: string) => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        return blob.size;
    } catch {
        return 0;
    }
};

const getScaledDimensions = (width: number, height: number) => {
    if (width <= 0 || height <= 0) {
        return {
            width: TARGET_MIN_DIMENSION,
            height: TARGET_MIN_DIMENSION,
        };
    }

    const shortestSide = Math.min(width, height);

    if (shortestSide === TARGET_MIN_DIMENSION) {
        return { width, height };
    }

    const scale = TARGET_MIN_DIMENSION / shortestSide;

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
};

const isHeicLikeFile = (asset: ImagePickerAsset) => {
    const lowerFileName = (asset.file?.name || asset.fileName || '').toLowerCase();
    const lowerMimeType = (asset.file?.type || asset.mimeType || '').toLowerCase();

    return lowerFileName.endsWith('.heic')
        || lowerFileName.endsWith('.heif')
        || lowerMimeType.includes('heic')
        || lowerMimeType.includes('heif');
};

const loadWebImage = async (src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new globalThis.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Failed to load the selected image for compression.'));
        image.src = src;
    });
};

const canvasToJpegBlob = async (canvas: HTMLCanvasElement) => {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                    return;
                }

                reject(new Error('Failed to convert the selected image to JPEG.'));
            },
            'image/jpeg',
            JPEG_COMPRESS_QUALITY,
        );
    });
};

interface WebImageSource {
    url: string;
    revoke: () => void;
}

type Heic2AnyConverter = (options: {
    blob: Blob;
    toType: string;
    quality?: number;
}) => Promise<Blob | Blob[]>;

const convertHeicBlobToJpegBlob = async (blob: Blob) => {
    const heic2anyModule = await import('heic2any');
    const heic2any = heic2anyModule.default as Heic2AnyConverter;
    const convertedResult = await heic2any({
        blob,
        toType: 'image/jpeg',
        quality: JPEG_COMPRESS_QUALITY,
    });

    if (Array.isArray(convertedResult)) {
        const firstBlob = convertedResult[0];

        if (firstBlob instanceof Blob) {
            return firstBlob;
        }
    }

    if (convertedResult instanceof Blob) {
        return convertedResult;
    }

    throw new Error('Failed to convert the selected HEIC image to JPEG.');
};

const getWebImageSource = async (asset: ImagePickerAsset): Promise<WebImageSource> => {
    if (!asset.file) {
        return {
            url: asset.uri,
            revoke: () => {},
        };
    }

    const rawObjectUrl = URL.createObjectURL(asset.file);

    try {
        await loadWebImage(rawObjectUrl);

        return {
            url: rawObjectUrl,
            revoke: () => {
                URL.revokeObjectURL(rawObjectUrl);
            },
        };
    } catch {
        URL.revokeObjectURL(rawObjectUrl);

        if (!isHeicLikeFile(asset)) {
            throw new Error('Failed to load the selected image for compression.');
        }

        const convertedBlob = await convertHeicBlobToJpegBlob(asset.file);
        const convertedObjectUrl = URL.createObjectURL(convertedBlob);

        return {
            url: convertedObjectUrl,
            revoke: () => {
                URL.revokeObjectURL(convertedObjectUrl);
            },
        };
    }
};

const prepareWebImageForUpload = async (asset: ImagePickerAsset): Promise<UploadThingReactNativeFile> => {
    const source = await getWebImageSource(asset);

    try {
        const image = await loadWebImage(source.url);
        const originalWidth = image.naturalWidth || asset.width || 0;
        const originalHeight = image.naturalHeight || asset.height || 0;
        const { width, height } = getScaledDimensions(originalWidth, originalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Failed to create a canvas context for image compression.');
        }

        context.drawImage(image, 0, 0, width, height);

        const blob = await canvasToJpegBlob(canvas);
        const name = ensureJpegFileName(asset.file?.name || asset.fileName || undefined);
        const file = new File([blob], name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
        });

        return {
            uri: file.name,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            file,
        };
    } finally {
        source.revoke();
    }
};

export const prepareImageForUpload = async (
    asset: ImagePickerAsset,
): Promise<UploadThingReactNativeFile> => {
    if (Platform.OS === 'web') {
        return prepareWebImageForUpload(asset);
    }

    const width = asset.width ?? 0;
    const height = asset.height ?? 0;
    const shortestSide = Math.min(width, height);
    const shouldResize = shortestSide !== TARGET_MIN_DIMENSION;

    const actions: ImageManipulator.Action[] = [];

    if (shouldResize) {
        if (width <= height) {
            actions.push({ resize: { width: TARGET_MIN_DIMENSION } });
        } else {
            actions.push({ resize: { height: TARGET_MIN_DIMENSION } });
        }
    }

    const manipulatedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        actions,
        {
            compress: JPEG_COMPRESS_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
        },
    );

    const size = (await getFileSizeFromUri(manipulatedImage.uri)) || asset.fileSize || 0;

    return {
        uri: manipulatedImage.uri,
        name: ensureJpegFileName(asset.fileName || undefined),
        size,
        type: 'image/jpeg',
        lastModified: Date.now(),
    };
};

export const prepareWebFileForUpload = async (file: File): Promise<UploadThingReactNativeFile> => {
    return await prepareWebImageForUpload({
        uri: file.name,
        width: 0,
        height: 0,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        file,
    } as ImagePickerAsset);
};

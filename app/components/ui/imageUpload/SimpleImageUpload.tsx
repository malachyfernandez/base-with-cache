import React, { useState } from 'react';
import { useAction } from 'convex/react';
import { ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../../convex/_generated/api';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import { prepareImageForUpload, prepareWebFileForUpload, UploadThingReactNativeFile } from '../../../../utils/imageCompression';
import { useToast } from '../../../../contexts/ToastContext';

type UrlSetter = (url: string) => void;

interface UploadThingSignedUpload {
    url: string;
    key: string;
    serverData?: {
        url?: string;
    };
}

interface UploadThingUploadedFileResponse {
    url: string;
    appUrl: string;
    ufsUrl: string;
    fileHash: string;
    serverData?: {
        url?: string;
    };
}

interface SimpleImageUploadProps {
    onUpload: UrlSetter;
    buttonLabel?: string;
    className?: string;
    variant?: 'filled' | 'accent' | 'grey' | 'outline' | 'outline-alt';
}

const UPLOAD_TIMEOUT_MS = 90000;

const withTimeout = async <T,>(promise: Promise<T>, message: string, timeoutMs: number = UPLOAD_TIMEOUT_MS) => {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
    ]);
};

const UPLOAD_FAILURE_MESSAGE = 'Image Upload Failed. If obscure file type, use .JPG or .PNG for best results';

const pickWebImageFile = async () => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
        throw new Error('The browser file picker is unavailable in this environment.');
    }

    return await new Promise<File | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        let resolved = false;

        const cleanup = () => {
            window.removeEventListener('focus', handleWindowFocus);
            input.remove();
        };

        const finalize = (file: File | null) => {
            if (resolved) return;
            resolved = true;
            cleanup();
            resolve(file);
        };

        const handleWindowFocus = () => {
            window.setTimeout(() => {
                finalize(input.files?.[0] ?? null);
            }, 300);
        };

        input.onchange = () => finalize(input.files?.[0] ?? null);
        window.addEventListener('focus', handleWindowFocus, { once: true });
        document.body.appendChild(input);
        input.click();
    });
};

const uploadFileToPresignedUrl = async (
    file: UploadThingReactNativeFile,
    signedUpload: UploadThingSignedUpload,
) => {
    return new Promise<UploadThingUploadedFileResponse>((resolve, reject) => {
        const formData = new FormData();

        if (file.file) {
            formData.append('file', file.file);
        } else {
            formData.append('file', {
                uri: file.uri,
                type: file.type,
                name: file.name,
            } as never);
        }

        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUpload.url, true);
        xhr.setRequestHeader('Range', 'bytes=0-');
        xhr.setRequestHeader('x-uploadthing-version', '7.7.4');
        xhr.responseType = 'json';
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response as UploadThingUploadedFileResponse);
                return;
            }
            reject(new Error(`Upload failed with status ${xhr.status}.`));
        };
        xhr.onerror = () => reject(new Error('Upload request failed.'));
        xhr.send(formData);
    });
};

const SimpleImageUpload = ({
    onUpload,
    buttonLabel = 'Upload image',
    className = '',
    variant = 'accent',
}: SimpleImageUploadProps) => {
    const [isUploading, setIsUploading] = useState(false);
    const { showToast } = useToast();
    const generatePublicImageUploadUrl = useAction(api.uploadthing.generatePublicImageUploadUrl);

    const handleUpload = async () => {
        try {

            if (Platform.OS === 'web') {
                const selectedFile = await pickWebImageFile();

                if (!selectedFile) {
                    return;
                }

                setIsUploading(true);
                const file = await withTimeout(
                    prepareWebFileForUpload(selectedFile),
                    'Preparing the image took too long. Please try a smaller image.',
                );
                const signedUpload = await withTimeout(generatePublicImageUploadUrl({
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                }) as Promise<UploadThingSignedUpload>, 'Generating the upload URL took too long. Please try again.');
                const uploadedFile = await withTimeout(
                    uploadFileToPresignedUrl(file, signedUpload),
                    'Uploading the image took too long. Please try again.',
                );
                const publicUrl = uploadedFile.serverData?.url ?? uploadedFile.ufsUrl ?? uploadedFile.url;

                if (!publicUrl) {
                    throw new Error('Upload completed but no public URL was returned.');
                }

                onUpload(publicUrl);
                return;
            }

            const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                showToast(UPLOAD_FAILURE_MESSAGE);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 1,
            });

            if (result.canceled || !result.assets?.length) {
                return;
            }

            setIsUploading(true);
            const file = await withTimeout(
                prepareImageForUpload(result.assets[0]),
                'Preparing the image took too long. Please try a smaller image.',
            );
            const signedUpload = await withTimeout(generatePublicImageUploadUrl({
                name: file.name,
                size: file.size,
                type: file.type,
                lastModified: file.lastModified,
            }) as Promise<UploadThingSignedUpload>, 'Generating the upload URL took too long. Please try again.');
            const uploadedFile = await withTimeout(
                uploadFileToPresignedUrl(file, signedUpload),
                'Uploading the image took too long. Please try again.',
            );
            const publicUrl = uploadedFile.serverData?.url ?? uploadedFile.ufsUrl ?? uploadedFile.url;

            if (!publicUrl) {
                throw new Error('Upload completed but no public URL was returned.');
            }

            onUpload(publicUrl);
        } catch (error) {
            showToast(UPLOAD_FAILURE_MESSAGE);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AppButton variant={variant} className={`w-40 ${className}`} onPress={handleUpload}>
            {isUploading ? (
                <ActivityIndicator color='white' />
            ) : (
                <FontText weight='medium' color={variant === 'outline' ? 'black' : 'white'}>
                    {buttonLabel}
                </FontText>
            )}
        </AppButton>
    );
};

export default SimpleImageUpload;

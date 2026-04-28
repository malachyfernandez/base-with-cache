/**
 * PublicImageUpload - A complete image upload component with UploadThing integration
 * 
 * This component handles the full image upload workflow including:
 * - Media library permissions
 * - Image selection and editing
 * - Upload to UploadThing service
 * - Progress indication and error handling
 * - Image preview after successful upload
 * 
 * @example Basic Usage
 * ```tsx
 * const [imageUrl, setImageUrl] = useState('');
 * 
 * <PublicImageUpload
 *   url={imageUrl}
 *   setUrl={setImageUrl}
 *   buttonLabel="Upload profile picture"
 *   emptyLabel="No profile picture uploaded yet"
 * />
 * ```
 * 
 * @props {string} url - Current uploaded image URL
 * @props {Dispatch<SetStateAction<string>>} setUrl - Function to update the URL state
 * @props {string} buttonLabel - Text for the upload button (default: "Upload image")
 * @props {string} emptyLabel - Text shown when no image is uploaded (default: "No image uploaded yet")
 * 
 * @workflow
 * 1. User clicks upload button
 * 2. Requests media library permissions
 * 3. Opens image picker with editing enabled
 * 4. Converts selected asset to UploadThing format
 * 5. Generates presigned upload URL from Convex
 * 6. Uploads file to UploadThing service
 * 7. Updates URL state with public image URL
 * 8. Shows preview of uploaded image
 * 
 * @features
 * - Automatic error handling with user-friendly messages
 * - Loading state during upload process
 * - Image preview with proper aspect ratio
 * - Permission request handling
 * - Support for both file assets and URI-based assets
 * 
 * @dependencies
 * - expo-image-picker for image selection
 * - UploadThing for file hosting
 * - Convex for backend integration
 */
import React, { Dispatch, SetStateAction, useState } from 'react';
import { useAction } from 'convex/react';
import { ActivityIndicator, Image, View, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../../convex/_generated/api';
import Column from '../../layout/Column';
import AppButton from '../buttons/AppButton';
import FontText from '../text/FontText';
import { prepareImageForUpload, prepareWebFileForUpload, UploadThingReactNativeFile } from '../../../../utils/imageCompression';
import { useToast } from '../../../../contexts/ToastContext';

type UrlSetter = Dispatch<SetStateAction<string>>;

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

interface PublicImageUploadProps {
    url: string;
    setUrl: UrlSetter;
    buttonLabel?: string;
    emptyLabel?: string;
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

const PublicImageUpload = ({
    url,
    setUrl,
    buttonLabel = 'Upload image',
    emptyLabel = 'No image uploaded yet.',
}: PublicImageUploadProps) => {
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

                setUrl(publicUrl);
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

            setUrl(publicUrl);
        } catch (error) {
            showToast(UPLOAD_FAILURE_MESSAGE);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Column className='gap-4 w-full p-4 border-b border-subtle-border bg-light/30'>
            <Column className='gap-3'>
                <FontText weight='medium'>Public image upload</FontText>

                <AppButton variant='green' className='w-40' onPress={handleUpload}>
                    {isUploading ? (
                        <ActivityIndicator color='white' />
                    ) : (
                        <FontText weight='medium' color='white'>
                            {buttonLabel}
                        </FontText>
                    )}
                </AppButton>

                {isUploading ? (
                    <FontText variant='subtext'>Uploading image...</FontText>
                ) : null}


                {url ? (
                    <Column className='gap-2'>
                        <FontText variant='subtext'>
                            {url}
                        </FontText>

                        <View className='w-full h-56 overflow-hidden rounded-lg border border-subtle-border bg-background'>
                            <Image
                                source={{ uri: url }}
                                className='w-full h-full'
                                resizeMode='cover'
                            />
                        </View>
                    </Column>
                ) : (
                    <FontText variant='subtext'>{emptyLabel}</FontText>
                )}
            </Column>
        </Column>
    );
};

export default PublicImageUpload;

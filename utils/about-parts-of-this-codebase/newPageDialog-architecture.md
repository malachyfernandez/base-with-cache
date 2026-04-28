# NewPageDialog Architecture: Complete Technical Documentation

## Table of Contents
1. [SimpleImageUpload Component](#simpleimageupload-component)
2. [ImageUrlModal Component](#imageurlmodal-component)
3. [Image Compression Pipeline](#image-compression-pipeline)
4. [UploadThing Integration](#uploadthing-integration)
5. [AI Generation System](#ai-generation-system)
6. [Prompt Engineering](#prompt-engineering)
7. [GenerationContext State Management](#generationcontext-state-management)
8. [Page Creation Workflow](#page-creation-workflow)
9. [Form Validation & Error Handling](#form-validation--error-handling)
10. [Undo/Redo Support](#undoredo-support)
11. [Technical Dependencies](#technical-dependencies)
12. [Complete User Experience Flow](#complete-user-experience-flow)

---

## SimpleImageUpload Component

### Platform Detection and File Handling

**File: `app/components/document/SimpleImageUpload.tsx`**

```typescript
// Platform-specific file selection
if (Platform.OS === 'web') {
    const selectedFile = await pickWebImageFile();
    
    if (!selectedFile) {
        setIsButtonClicked(false);
        return;
    }
    
    setIsUploading(true);
    const preparedFile = await withTimeout(
        prepareWebFileForUpload(selectedFile),
        'Preparing the image took too long. Please try a smaller image.',
    );
} else {
    // Native platform flow
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
        setError('Permission to access media library is required.');
        setIsButtonClicked(false);
        return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
    });
}
```

### Web File Picker Implementation

```typescript
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
```

### Upload to Presigned URL

```typescript
const uploadFileToPresignedUrl = async (
    file: UploadThingReactNativeFile,
    signedUpload: UploadThingSignedUpload,
) => {
    return new Promise<UploadThingUploadedFileResponse>(async (resolve, reject) => {
        const formData = new FormData();

        if (file.file) {
            formData.append('file', file.file);
        } else {
            // Create a blob from the URI for React Native
            const response = await fetch(file.uri);
            const blob = await response.blob();
            formData.append('file', blob, file.name);
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
            reject(new Error(xhr.responseText));
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
};
```

---

## ImageUrlModal Component

### URL Validation and Preview System

**File: `app/components/document/ImageUrlModal.tsx`**

```typescript
const checkImageUrl = async (imageUrl: string) => {
    if (!imageUrl.trim()) {
        setError('Please enter an image URL');
        return;
    }

    try {
        setIsLoading(true);
        setError('');
        
        // Test if the URL loads
        const img = new Image();
        img.onload = () => {
            setPreviewUrl(imageUrl);
            setIsLoading(false);
        };
        img.onerror = () => {
            setError('Could not load image from this URL');
            setIsLoading(false);
        };
        img.src = imageUrl;
    } catch (err) {
        setError('Invalid image URL');
        setIsLoading(false);
    }
};
```

### Preview Component

```typescript
{previewUrl && (
    <Column gap={2}>
        <PoppinsText weight='medium'>Preview</PoppinsText>
        <div className='w-full h-48 border border-subtle-border bg-inner-background rounded-lg overflow-hidden'>
            <img 
                src={previewUrl} 
                alt="Preview" 
                className='w-full h-full object-contain'
                onError={() => setError('Failed to load preview')}
            />
        </div>
    </Column>
)}
```

---

## Image Compression Pipeline

### Target Specifications

**File: `utils/imageCompression.ts`**

```typescript
const TARGET_MIN_DIMENSION = 1080;
const JPEG_COMPRESS_QUALITY = 0.72;
```

### HEIC Detection and Conversion

```typescript
const isHeicLikeFile = (asset: ImagePickerAsset) => {
    const lowerFileName = (asset.file?.name || asset.fileName || '').toLowerCase();
    const lowerMimeType = (asset.file?.type || asset.mimeType || '').toLowerCase();

    return lowerFileName.endsWith('.heic')
        || lowerFileName.endsWith('.heif')
        || lowerMimeType.includes('heic')
        || lowerMimeType.includes('heif');
};

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
```

### Dimension Scaling Logic

```typescript
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
```

### Web Image Processing with Canvas

```typescript
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
```

### Native Image Processing

```typescript
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
```

---

## UploadThing Integration

### Convex Action for Presigned URL Generation

**File: `convex/uploadthing.ts`**

```typescript
export const generatePublicImageUploadUrl = action({
    args: {
        name: v.string(),
        size: v.number(),
        type: v.string(),
        lastModified: v.number(),
    },
    handler: async (_ctx, args) => {
        const token = process.env.UPLOADTHING_TOKEN;

        if (!token) {
            throw new Error('UPLOADTHING_TOKEN is missing from the Convex environment. Run `npx convex env set UPLOADTHING_TOKEN <your_token>` or add it in the Convex dashboard for this deployment.');
        }

        const { apiKey, appId, regions, ingestHost = 'ingest.uploadthing.com' } = parseUploadThingToken(token);
        const preferredRegion = regions[0];
        const ingestUrl = `https://${preferredRegion}.${ingestHost}`;
        const file = {
            name: args.name,
            size: args.size,
            type: args.type,
            lastModified: args.lastModified,
        };

        const key = await Effect.runPromise(generateKey(file, appId));
        const signedUrl = await Effect.runPromise(
            generateSignedURL(`${ingestUrl}/${key}`, Redacted.make(apiKey), {
                data: {
                    'x-ut-identifier': appId,
                    'x-ut-file-name': args.name,
                    'x-ut-file-size': args.size,
                    'x-ut-file-type': args.type,
                    'x-ut-content-disposition': 'inline',
                },
            }),
        );

        return {
            url: signedUrl,
            key,
        };
    },
});
```

### Token Parsing

```typescript
const parseUploadThingToken = (token: string) => {
    const decodedToken = Buffer.from(token, 'base64').toString('utf8');
    const parsedToken = JSON.parse(decodedToken) as {
        apiKey: string;
        appId: string;
        regions: string[];
        ingestHost?: string;
    };

    if (!parsedToken.apiKey || !parsedToken.appId || !parsedToken.regions?.length) {
        throw new Error('Invalid UploadThing token configuration.');
    }

    return parsedToken;
};
```

### Upload Flow in SimpleImageUpload

```typescript
const signedUpload = await withTimeout(generatePublicImageUploadUrl({
    name: preparedFile.name,
    size: preparedFile.size,
    type: preparedFile.type,
    lastModified: preparedFile.lastModified,
}) as Promise<UploadThingSignedUpload>, 'Generating the upload URL took too long. Please try again.');

const uploadedFile = await withTimeout(
    uploadFileToPresignedUrl(preparedFile, signedUpload),
    'Uploading the image took too long. Please try again.',
);
const publicUrl = uploadedFile.ufsUrl ?? uploadedFile.url;

if (!publicUrl) {
    throw new Error('Upload completed but no public image URL was returned.');
}

setUrl(publicUrl);
```

---

## AI Generation System

### Convex Action for Math Conversion

**File: `convex/mathAi.ts`**

```typescript
export const convertMathImageToMarkdown = action({
    args: {
        imageUrl: v.string(),
        guidance: v.optional(v.string()),
        currentMarkdown: v.optional(v.string()),
        followUpPrompt: v.optional(v.string()),
        documentTitle: v.optional(v.string()),
        pageTitle: v.optional(v.string()),
    },
    handler: async (_ctx, args) => {
        console.log('=== CONVERT MATH IMAGE TO MARKDOWN START ===');
        console.log('INPUT ARGS:', JSON.stringify(args, null, 2));

        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error('OPENROUTER_API_KEY is missing');
            throw new Error('OPENROUTER_API_KEY is missing from the Convex environment. Run `npx convex env set OPENROUTER_API_KEY <your_key>` or add it in the Convex dashboard for this deployment.');
        }

        const prompt = buildPrompt(args);
        console.log('GENERATED PROMPT:', prompt);
        console.log('IMAGE URL:', args.imageUrl);

        const requestBody = {
            model: 'google/gemini-3.1-flash-lite-preview',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: args.imageUrl,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 4000,
            reasoning: {
                level: 'minimal'
            }
        };

        console.log('OPENROUTER REQUEST BODY:', JSON.stringify(requestBody, null, 2));

        try {
            console.log('SENDING REQUEST TO OPENROUTER...');
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://paper.app',
                    'X-OpenRouter-Title': 'Paper',
                    'X-OpenRouter-Speed': 'nitro',
                },
                body: JSON.stringify(requestBody),
            });

            console.log('OPENROUTER RESPONSE STATUS:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('OPENROUTER ERROR RESPONSE:', errorText);
                throw new Error(`OpenRouter request failed: ${errorText}`);
            }

            const completion = await response.json();
            console.log('OPENROUTER RESPONSE JSON:', JSON.stringify(completion, null, 2));

            // Extract markdown from chat completions response
            const markdown = completion.choices?.[0]?.message?.content?.trim() || '';
            console.log('EXTRACTED MARKDOWN:', markdown);
            console.log('MARKDOWN LENGTH:', markdown.length);

            if (!markdown) {
                console.error('EMPTY MARKDOWN EXTRACTED FROM RESPONSE');
                console.log('FULL RESPONSE STRUCTURE:', JSON.stringify(completion, null, 2));
                throw new Error('OpenRouter returned an empty response.');
            }

            console.log('=== CONVERT MATH IMAGE TO MARKDOWN SUCCESS ===');
            return {
                markdown,
            };
        } catch (error) {
            console.error('=== CONVERT MATH IMAGE TO MARKDOWN ERROR ===');
            console.error('ERROR TYPE:', typeof error);
            console.error('ERROR MESSAGE:', error instanceof Error ? error.message : String(error));
            console.error('ERROR STACK:', error instanceof Error ? error.stack : 'No stack trace');
            throw error;
        }
    },
});
```

### Response Parsing

```typescript
const getOutputText = (response: any) => {
    if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
        return response.output_text.trim();
    }

    if (!Array.isArray(response.output)) {
        return '';
    }

    const parts: string[] = [];

    for (const item of response.output) {
        if (!Array.isArray(item?.content)) {
            continue;
        }

        for (const contentItem of item.content) {
            if (contentItem?.type === 'output_text' && typeof contentItem.text === 'string') {
                parts.push(contentItem.text);
            }
        }
    }

    return parts.join('\n').trim();
};
```

---

## Prompt Engineering

### Prompt Building Logic

```typescript
const buildPrompt = ({
    guidance,
    currentMarkdown,
    followUpPrompt,
    documentTitle,
    pageTitle,
}: {
    guidance?: string;
    currentMarkdown?: string;
    followUpPrompt?: string;
    documentTitle?: string;
    pageTitle?: string;
}) => {
    const promptParts = [
        'You are converting a handwritten math page into accessible markdown with LaTeX.',
        'PRIMARY GOAL: Transcribe EXACTLY what is in the image. DO NOT PARAPHRASE. DO NOT TRUNCATE. Include every single element.',
        'For visual elements (diagrams, charts, arrows, symbols, drawings): Describe them thoroughly in text so the reader can understand the full page without seeing the image.',
        'Think carefully about how to convey arrows, visual relationships, spatial arrangements, and other non-text elements using descriptive text.',
        'Use standard markdown for prose and lists.',
        'Use LaTeX for all mathematical notation.',
        'Do not wrap the final answer in code fences.',
        'If handwriting is ambiguous, make the best reasonable interpretation but preserve uncertainty in natural language within the markdown.',
        'The reader should be able to understand the complete page by reading only your text.',
    ];

    if (documentTitle) {
        promptParts.push(`The document title is "${documentTitle}".`);
    }

    if (pageTitle) {
        promptParts.push(`The page title is "${pageTitle}".`);
    }

    if (guidance && guidance.trim().length > 0) {
        promptParts.push(`The user has given the guidence of "${guidance.trim()}".`);
    }

    if (currentMarkdown && currentMarkdown.trim().length > 0) {
        promptParts.push('The current markdown document is below. Use it as the current source of truth before applying edits.');
        promptParts.push(currentMarkdown.trim());
    }

    if (followUpPrompt && followUpPrompt.trim().length > 0) {
        promptParts.push(`The user follow-up adjustment prompt is "${followUpPrompt.trim()}".`);
    } else {
        promptParts.push('This is the initial conversion request for the uploaded image.');
    }

    return promptParts.join('\n\n');
};
```

### Default AI Guidance

**File: `app/components/document/NewPageDialog.tsx`**

```typescript
// Get user-wide AI guidance
const [aiGuidance] = useUserVariable({
    key: 'aiGuidance',
    defaultValue: 'Convert this handwritten math to Markdown + LaTeX with exact transcription.',
    privacy: 'PRIVATE'
});
```

---

## GenerationContext State Management

### Context Provider

**File: `contexts/GenerationContext.tsx`**

```typescript
export const GenerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [generatingPages, setGeneratingPages] = useState<Set<string>>(new Set());
  const [recentlyCompletedPages, setRecentlyCompletedPages] = useState<Set<string>>(new Set());

  const setGeneratingPage = (pageId: string, isGenerating: boolean) => {
    setGeneratingPages(prev => {
      const newSet = new Set(prev);
      if (isGenerating) {
        newSet.add(pageId);
        // Remove from recently completed when starting new generation
        setRecentlyCompletedPages(completed => {
          const newCompleted = new Set(completed);
          newCompleted.delete(pageId);
          return newCompleted;
        });
      } else {
        newSet.delete(pageId);
        // Add to recently completed when generation finishes
        setRecentlyCompletedPages(completed => {
          const newCompleted = new Set(completed);
          newCompleted.add(pageId);
          return newCompleted;
        });
      }
      return newSet;
    });
  };

  const isPageGenerating = (pageId: string) => {
    return generatingPages.has(pageId);
  };

  const isPageRecentlyCompleted = (pageId: string) => {
    return recentlyCompletedPages.has(pageId);
  };

  const clearRecentlyCompleted = (pageId: string) => {
    setRecentlyCompletedPages(prev => {
      const newSet = new Set(prev);
      newSet.delete(pageId);
      return newSet;
    });
  };

  return (
    <GenerationContext.Provider value={{ 
      generatingPages, 
      recentlyCompletedPages,
      setGeneratingPage, 
      isPageGenerating, 
      isPageRecentlyCompleted,
      clearRecentlyCompleted 
    }}>
      {children}
    </GenerationContext.Provider>
  );
};
```

### Usage in NewPageDialog

```typescript
const { setGeneratingPage, isPageGenerating } = useGeneration();

// In handleCreate function
if (startGeneration && imageUrl) {
    // Start generation in the background after dialog is closed
    setCreatedPage(newPage);
    setIsGenerating(true);
    setErrorMessage('');

    try {
        setGeneratingPage(pageId, true);

        const result = await convertMathImageToMarkdown({
            imageUrl: newPage.imageUrl,
            guidance: aiGuidance.value,
            currentMarkdown: '',
        });

        // ... process result ...

    } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'AI conversion failed.');
    } finally {
        setGeneratingPage(pageId, false);
        setIsGenerating(false);
    }
}
```

---

## Page Creation Workflow

### Two-Button System

**File: `app/components/document/NewPageDialog.tsx`**

```typescript
// Form validation
const isValidTitle = title.trim().length > 0;
const hasImage = imageUrl.trim().length > 0;
const canCreate = isValidTitle && hasImage;

// Button rendering logic
{isValidTitle && hasImage ? (
    <>
        <AppButton variant='outline-alt' className='h-12 max-w-[150px] w-full' onPress={() => void handleCreate(false)}>
            <PoppinsText weight='medium'>
                {`No Generation`}
            </PoppinsText>
        </AppButton>
        <AppButton variant={createButtonVariant} className='h-12 flex-1' onPress={() => void handleCreate(true)}>
            <PoppinsText weight='medium' color='white'>
                {`Generate Page  →`}
            </PoppinsText>
        </AppButton>
    </>
) : (
    <StatusButton
        buttonText="Create page"
        buttonAltText={!hasImage ? "Upload an image first" : "Add a title"}
        className="h-12 w-full"
    />
)}
```

### Page Creation Logic

```typescript
const handleCreate = async (startGeneration: boolean = false) => {
    const pageId = generateId();
    const newPage: MathDocumentPage = {
        id: pageId,
        documentId,
        pageNumber: nextPageNumber,
        title: title.trim() || `Page ${nextPageNumber}`,
        imageUrl,
        markdown: startGeneration ? '' : 'BLANK PAGE',
        lastAiPrompt: '',
        followUps: [],
    };

    executeCommand({
        action: async () => {
            await setPage({
                key: 'mathDocumentPages',
                itemId: pageId,
                value: newPage,
                privacy: 'PUBLIC',
                filterKey: 'documentId',
                searchKeys: ['title', 'markdown'],
                sortKey: 'pageNumber',
            });
        },
        undoAction: async () => {
            void removePage({ key: 'mathDocumentPages', itemId: pageId });
        },
        description: `Created page - ${newPage.title}`
    });

    // Close dialog immediately and navigate to the new page
    setIsOpen(false);
    onCreate(pageId);

    if (startGeneration && imageUrl) {
        // Start generation in the background after dialog is closed
        setCreatedPage(newPage);
        setIsGenerating(true);
        setErrorMessage('');

        try {
            setGeneratingPage(pageId, true);

            const result = await convertMathImageToMarkdown({
                imageUrl: newPage.imageUrl,
                guidance: aiGuidance.value,
                currentMarkdown: '',
            });

            const updatedPage: MathDocumentPage = {
                ...newPage,
                markdown: result.markdown,
                lastAiPrompt: aiGuidance.value,
                lastGeneratedAt: Date.now(),
            };

            executeCommand({
                action: async () => {
                    await setPage({
                        key: 'mathDocumentPages',
                        itemId: pageId,
                        value: updatedPage,
                        privacy: 'PUBLIC',
                        filterKey: 'documentId',
                        searchKeys: ['title', 'markdown'],
                        sortKey: 'pageNumber',
                    });
                },
                undoAction: async () => {
                    await setPage({
                        key: 'mathDocumentPages',
                        itemId: pageId,
                        value: newPage,
                        privacy: 'PUBLIC',
                        filterKey: 'documentId',
                        searchKeys: ['title', 'markdown'],
                        sortKey: 'pageNumber',
                    });
                },
                description: `Generated AI content for page - ${updatedPage.title}`
            });
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : 'AI conversion failed.');
        } finally {
            setGeneratingPage(pageId, false);
            setIsGenerating(false);
        }
    }
};
```

---

## Form Validation & Error Handling

### Validation Logic

```typescript
const isValidTitle = title.trim().length > 0;
const hasImage = imageUrl.trim().length > 0;
const canCreate = isValidTitle && hasImage;
```

### Error Message Display

```typescript
{errorMessage ? (
    <PoppinsText className='text-red-500 text-sm text-center'>{errorMessage}</PoppinsText>
) : null}
```

### Upload Error Handling

```typescript
const getUploadErrorMessage = (error: unknown) => {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }

    return 'Failed to upload image.';
};
```

### Timeout Protection

```typescript
const UPLOAD_TIMEOUT_MS = 90000;

const withTimeout = async <T,>(promise: Promise<T>, message: string, timeoutMs: number = UPLOAD_TIMEOUT_MS) => {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(message)), timeoutMs);
        }),
    ]);
};
```

---

## Undo/Redo Support

### Command Pattern Implementation

```typescript
const { executeCommand } = useUndoRedo();
const createUndoSnapshot = useCreateUndoSnapshot();

// Page creation command
executeCommand({
    action: async () => {
        await setPage({
            key: 'mathDocumentPages',
            itemId: pageId,
            value: newPage,
            privacy: 'PUBLIC',
            filterKey: 'documentId',
            searchKeys: ['title', 'markdown'],
            sortKey: 'pageNumber',
        });
    },
    undoAction: async () => {
        void removePage({ key: 'mathDocumentPages', itemId: pageId });
    },
    description: `Created page - ${newPage.title}`
});

// AI generation command
executeCommand({
    action: async () => {
        await setPage({
            key: 'mathDocumentPages',
            itemId: pageId,
            value: updatedPage,
            privacy: 'PUBLIC',
            filterKey: 'documentId',
            searchKeys: ['title', 'markdown'],
            sortKey: 'pageNumber',
        });
    },
    undoAction: async () => {
        await setPage({
            key: 'mathDocumentPages',
            itemId: pageId,
            value: newPage,
            privacy: 'PUBLIC',
            filterKey: 'documentId',
            searchKeys: ['title', 'markdown'],
            sortKey: 'pageNumber',
        });
    },
    description: `Generated AI content for page - ${updatedPage.title}`
});
```

---

## Technical Dependencies

### Key Libraries

```typescript
// Image handling
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { heic2any } from 'heic2any';

// Upload service
import { generateKey, generateSignedURL } from '@uploadthing/shared';

// Backend
import { useAction } from 'convex/react';
import { api } from 'convex/_generated/api';

// State management
import { useUserVariable } from 'hooks/useUserVariable';
import { useGeneration } from 'contexts/GenerationContext';
import { useUndoRedo } from 'hooks/useUndoRedo';
```

### Environment Variables

```typescript
// UploadThing integration
const token = process.env.UPLOADTHING_TOKEN;

// OpenRouter AI integration
const apiKey = process.env.OPENROUTER_API_KEY;
```

---

## Complete User Experience Flow

### Dialog State Management

```typescript
// Reset state when dialog opens
useEffect(() => {
    if (isOpen) {
        setTitle(`Page ${nextPageNumber}`);
        setImageUrl('');
        setIsImageUrlModalOpen(false);
        setIsUploading(false);
        setIsGenerating(false);
        setCreatedPage(null);
        setErrorMessage('');
    }
}, [isOpen, nextPageNumber]);

// Ensure modal states are properly closed when dialog closes
useEffect(() => {
    if (!isOpen) {
        setIsImageUrlModalOpen(false);
        setIsUploading(false);
    }
}, [isOpen]);
```

### Image Display Logic

```typescript
<View className='w-full h-56 overflow-hidden rounded-lg border border-subtle-border bg-background relative'>
    {imageUrl ? (
        <>
            <Image
                source={{ uri: imageUrl }}
                className='w-full h-full'
                resizeMode='contain'
            />
            <View className='absolute bottom-0 left-0 right-0 p-4 pt-12 bg-linear-to-t from-background to-transparent'>
                <PoppinsText varient='subtext' className='text-xs mb-2 text-center'>
                    {imageUrl}
                </PoppinsText>
                <Row gap={2}>
                    <View className='flex-1'>
                        <AppButton
                            variant='outline-alt'
                            className='h-12 w-full'
                            onPress={() => setIsImageUrlModalOpen(true)}
                        >
                            <PoppinsText weight='medium'>Use Image URL</PoppinsText>
                        </AppButton>
                    </View>
                    <View className='flex-1'>
                        <SimpleImageUpload
                            url={imageUrl}
                            setUrl={setImageUrl}
                            buttonLabel='Change Image'
                            emptyLabel='Upload page image'
                            className='w-full'
                        />
                    </View>
                </Row>
            </View>
        </>
    ) : (
        <Column className='flex-1 items-center justify-center p-4'>
            <PoppinsText varient='subtext' className='text-center mb-4'>Upload a math image to get started</PoppinsText>
            <Row gap={2}>
                <AppButton
                    variant='outline-alt'
                    className='h-12 px-5'
                    onPress={() => setIsImageUrlModalOpen(true)}
                >
                    <PoppinsText weight='medium'>Use Image URL</PoppinsText>
                </AppButton>
                <SimpleImageUpload
                    url={imageUrl}
                    setUrl={setImageUrl}
                    buttonLabel='Upload Image'
                    emptyLabel='Upload page image'
                    className='flex-1'
                />
            </Row>
        </Column>
    )}
</View>
```

### Complete Flow Summary

1. **Dialog Opens**: Reset all state, set default title
2. **Image Input**: Choose between file upload or URL entry
3. **File Upload**: Platform-specific picker → compression → UploadThing upload
4. **URL Entry**: Validation → preview → acceptance
5. **Title Entry**: Optional custom page title
6. **Validation**: Ensure both title and image are present
7. **Creation Choice**: "No Generation" or "Generate Page"
8. **Page Creation**: Store with undo/redo support
9. **Dialog Close**: Navigate to new page immediately
10. **Background AI**: Process image if generation requested
11. **State Updates**: Generation context tracking
12. **Error Recovery**: Comprehensive error handling throughout

This architecture provides a robust, cross-platform solution for converting handwritten mathematics into accessible digital format with optional AI assistance.

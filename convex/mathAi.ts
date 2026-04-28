declare const process: {
    env: Record<string, string | undefined>;
};

import { v } from 'convex/values';
import { action } from './_generated/server';

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

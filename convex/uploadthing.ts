"use node";

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import { v } from 'convex/values';
import { generateKey, generateSignedURL } from '@uploadthing/shared';
import { action } from './_generated/server';

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

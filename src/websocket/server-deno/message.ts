import { CheckByZod } from "../../checkByZod.ts";
import { JSONValueZod } from '../../Json.ts';
import { z } from 'zod';

const MessageBrowserZod = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('subscribe'),
        id: z.number(), //request id
        resource: JSONValueZod,
    }),
    z.object({
        type: z.literal('unsubscribe'),
        id: z.number(), //request id
    }),
]);

export const MessageBrowserCheck = new CheckByZod('Socket deno MessageBrowser', MessageBrowserZod);

export type MessageBrowserType = z.TypeOf<typeof MessageBrowserZod>;

export const MessageServerZod = z.union([
    z.object({
        type: z.literal('data'),
        id: z.number(),
        data: JSONValueZod,            //dane dotyczące tego konkretnego modelu
    }),
    z.object({
        type: z.literal('error-message'),
        message: z.string(),
    })
]);

export type MessageServerType = z.TypeOf<typeof MessageServerZod>;

import { z } from 'zod';
import { JSONValue } from '@reactive/utils';

export type SubscriptionRouter<K extends string> = Record<K, { resourceId: z.ZodType<JSONValue>, resp: z.ZodType<JSONValue>}>;

export type CreateSubscriptionData<K extends string, T extends SubscriptionRouter<K>> = {
    [K in keyof T]: {
        type: K;
        resourceId: z.infer<T[K]['resourceId']>;
        response: (response: T[K]['resp'] extends z.ZodType<infer P> ? P : never) => void;
    }
}[keyof T];



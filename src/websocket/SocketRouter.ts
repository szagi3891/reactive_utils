import { JSONValue } from "../Json.ts";
import { z } from 'zod';

export class SocketRouter {
    public static valueList = <
        R extends JSONValue,
        ID extends JSONValue,
        M extends JSONValue
    >(resourceId: z.ZodType<R>, idType: z.ZodType<ID>, modelType: z.ZodType<M>) => {
        return {
            resourceId,
            resp: z.array(z.union([
                z.object({
                    type: z.literal('set'),
                    id: idType,
                    model: modelType,
                }),
                z.object({
                    type: z.literal('delete'),
                    id: idType,
                }),
            ])),
        };
    }

    public static value = <
        R extends JSONValue,
        M extends JSONValue,
    >(resourceId: z.ZodType<R>, modelType: z.ZodType<M>) => {
        return {
            resourceId,
            resp: modelType
        }
    };
}


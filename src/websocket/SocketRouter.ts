import { JSONValue } from "../Json.ts";
import { z } from 'zod';

const valueList = <
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

const value = <
    R extends JSONValue,
    M extends JSONValue,
>(resourceId: z.ZodType<R>, modelType: z.ZodType<M>) => {
    return {
        resourceId,
        resp: modelType
    }
};

export type ValueListReturnType<R extends JSONValue, ID extends JSONValue, M extends JSONValue> = ReturnType<
    typeof valueList<R, ID, M>
>;

// Typ dla funkcji value
export type ValueReturnType<R extends JSONValue, M extends JSONValue> = ReturnType<
    typeof value<R, M>
>;

export class SocketRouter {
    public static valueList = <
        R extends JSONValue,
        ID extends JSONValue,
        M extends JSONValue
    >(resourceId: z.ZodType<R>, idType: z.ZodType<ID>, modelType: z.ZodType<M>): ValueListReturnType<R, ID, M> => {
        return valueList(resourceId, idType, modelType);
    }

    public static value = <
        R extends JSONValue,
        M extends JSONValue,
    >(resourceId: z.ZodType<R>, modelType: z.ZodType<M>): ValueReturnType<R, M> => {
        return {
            resourceId,
            resp: modelType
        }
    };
}

import { JSONValue } from "../Json.ts";
import { z } from 'zod';
import { Result } from "../Result.ts";

/*
    SOCKET - cała definicja
    RTYPE_ALL - typ reprezentujący wszystkie typy zasobów
    RTYPE - resourceType -- typ zasobu
    RID   - resourceId   -- konkretny id tego zasobu
    MID - modelId - id modelu w przypadku gdy to jest lista
    MVAL - model - wartość modelu
*/

type ValueListUpdateType<ID extends JSONValue, M extends JSONValue> = {
    type: 'set',
    id: ID,
    model: M
} | {
    type: 'delete',
    id: ID
};

export class DefValueList<
    R extends JSONValue,
    ID extends JSONValue,
    M extends JSONValue
> {

    private readonly resourceId: z.ZodType<R, z.ZodTypeDef, R>;
    private readonly resp;

    //W razie problemów, tą klasę można zamienić na funkcję, po to żeby nie musieć definioać tych skoplikowanych typów zod

    constructor(resourceId: z.ZodType<R>, modelId: z.ZodType<ID>, modelType: z.ZodType<M>) {
        this.resourceId = resourceId;

        this.resp = z.array(z.union([
            z.object({
                type: z.literal('set'),
                id: modelId,
                model: modelType,
            }),
            z.object({
                type: z.literal('delete'),
                id: modelId,
            }),
        ]));
    }

    decodeResourceId(data: JSONValue): Result<R, null> {
        const safeData = this.resourceId.safeParse(data);

        if (safeData.success) {
            return Result.ok(safeData.data);
        }

        return Result.error(null);
    }

    decodeResp(data: JSONValue): Result<ValueListUpdateType<ID, M>, null> {

        const safeData = this.resp.safeParse(data);

        if (safeData.success) {

            //@ts-expect-error
            return Result.ok(safeData.data);            //TODO - spróbować jakoś pozbyć się tego wykluczenia
        }

        return Result.error(null);
    }
}

export class DefValue<
    R extends JSONValue,
    M extends JSONValue,
> {
    constructor(
        private readonly resourceId: z.ZodType<R>,
        private readonly resp: z.ZodType<M>
    ) {
    }

    decodeResourceId(data: JSONValue): Result<R, null> {
        const safeData = this.resourceId.safeParse(data);

        if (safeData.success) {
            return Result.ok(safeData.data);
        }

        return Result.error(null);
    }

    decodeResp(data: JSONValue): Result<M, null> {

        const safeData = this.resp.safeParse(data);

        if (safeData.success) {
            return Result.ok(safeData.data);
        }

        return Result.error(null);
    }
}

export class SocketRouter {
    public static valueList = <
        R extends JSONValue,
        ID extends JSONValue,
        M extends JSONValue
    >(resourceId: z.ZodType<R>, idType: z.ZodType<ID>, modelType: z.ZodType<M>): DefValueList<R, ID, M> => {
        return new DefValueList(resourceId, idType, modelType);
    }

    public static value = <
        R extends JSONValue,
        M extends JSONValue,
    >(resourceId: z.ZodType<R>, modelType: z.ZodType<M>): DefValue<R, M> => {
        return new DefValue(resourceId, modelType);
    };
}

export type SubscriptionRouter<K extends string | number | symbol> = Record<
    K,
    DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>
>;

type ResourceIdInner<T extends DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>> =
    T extends DefValue<infer R, JSONValue> ? R
    : T extends DefValueList<infer R, JSONValue, JSONValue> ? R
    : never;

type Resp<T extends DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>> =
    T extends DefValue<JSONValue, infer R> ? R
    : T extends DefValueList<JSONValue, infer MID, infer MVAL> ? ValueListUpdateType<MID, MVAL>
    : never;

export type ResourceIdAll<SOCKET extends SubscriptionRouter<string>> = {
    [K in keyof SOCKET]: {
        resourceId: ResourceIdInner<SOCKET[K]>;
    }
}[keyof SOCKET]['resourceId'];


export type SocketValueModel<SOCKET extends SubscriptionRouter<RTYPE>, RTYPE extends string> =
    SOCKET[RTYPE] extends DefValue<JSONValue, infer M>
    ? M
    : never;

export type SocketValueListId<SOCKET extends SubscriptionRouter<RTYPE>, RTYPE extends string> =
    SOCKET[RTYPE] extends DefValueList<JSONValue, infer ID, JSONValue>
    ? ID
    : never;

export type SocketValueListModel<SOCKET extends SubscriptionRouter<RTYPE>, RTYPE extends string> =
    SOCKET[RTYPE] extends DefValueList<JSONValue, JSONValue, infer M>
    ? M
    : never;

export type CreateSubscriptionData<SOCKET extends SubscriptionRouter<RTYPE>, RTYPE extends string> = {
    [K in keyof SOCKET]: {
        type: K;
        resourceId: ResourceIdInner<SOCKET[K]>,
        response: (response: Resp<SOCKET[K]>) => void;
    }
}[keyof SOCKET];


const SocketConfig = {
    user: new DefValue(
        z.number(), //id
        z.object({
            name: z.string(),
            age: z.number(),
            verify: z.boolean(),
        })
    ),
    post: new DefValue(
        z.string(), //id
        z.object({
            title: z.string(),
            description: z.string(),
        })
    ),
    logs: new DefValueList(
        z.null(), //id
        z.number(),
        z.array(z.string()),
    )
};

type aaa = ResourceIdAll<typeof SocketConfig>; //number, string, null

type bbb = SocketValueModel<typeof SocketConfig, 'post'>;
type ccc = SocketValueListId<typeof SocketConfig, 'logs'>;

type ddd = SocketValueListModel<typeof SocketConfig, 'logs'>;
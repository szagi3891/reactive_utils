import { JSONValue } from "../Json.ts";
import { z } from 'zod';
import { Result } from "../Result.ts";
// import { Socket } from "./client/Socket.ts";

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
            return Result.ok(safeData.data);
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

export type SubscriptionRouter<K extends string> = Record<
    K,
    DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>
>;

export type SocketResourceId<T extends DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>> =
    T extends DefValue<infer R, JSONValue> ? R
    : T extends DefValueList<infer R, JSONValue, JSONValue> ? R
    : never;

type Resp<T extends DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>> =
    T extends DefValue<JSONValue, infer R> ? R
    : T extends DefValueList<JSONValue, infer MID, infer MVAL> ? Array<ValueListUpdateType<MID, MVAL>>
    : never;

export type ResourceIdAll<SOCKET extends SubscriptionRouter<string>> = {
    [K in keyof SOCKET]: {
        resourceId: SocketResourceId<SOCKET[K]>;
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
        resourceId: SocketResourceId<SOCKET[K]>,
        response: (response: Resp<SOCKET[K]>) => void;
    }
}[keyof SOCKET];


//Zwraca typ w którym są zawarte wszystkie klucze dla konfiguracji dotyczących ValueList
export type ResourceTypeForValueList<SOCKET extends Record<string | number | symbol, DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>>> = {
    [K in keyof SOCKET]: SOCKET[K] extends DefValueList<JSONValue, JSONValue, JSONValue> ? K : never
}[keyof SOCKET];

//Zwraca typ w którym są zawarte wszystkie klucze dla konfiguracji dotyczących Value
export type ResourceTypeForValue<SOCKET extends Record<string | number | symbol, DefValue<JSONValue, JSONValue> | DefValueList<JSONValue, JSONValue, JSONValue>>> = {
    [K in keyof SOCKET]: SOCKET[K] extends DefValue<JSONValue, JSONValue> ? K : never
}[keyof SOCKET];



// const SocketConfig = {
//     user: new DefValue(
//         z.number(), //id
//         z.object({
//             name: z.string(),
//             age: z.number(),
//             verify: z.boolean(),
//         })
//     ),
//     post: new DefValue(
//         z.string(), //id
//         z.object({
//             title: z.string(),
//             description: z.string(),
//         })
//     ),
//     logs: new DefValueList(
//         z.null(), //id
//         z.number(),
//         z.array(z.string()),
//     )
// };

// type aaa = ResourceIdAll<typeof SocketConfig>; //number, string, null

// type bbb = SocketValueModel<typeof SocketConfig, 'post'>;
// type ccc = SocketValueListId<typeof SocketConfig, 'logs'>;

// type ddd = SocketValueListModel<typeof SocketConfig, 'logs'>;

// const socket = new Socket(SocketConfig, 'ws://127.0.0.1:9999');

// //socket.createValue('user', 3);
// const post = socket.createValue('post', 'dsadsada');
// const logs = socket.createValueList('logs', null);
// const aaaa = socket.createValue('user', 4);

// const post1 = socket.createValueList('logs', null);

// type IN = {
//     model1: {
//         name: string,
//         age: number,
//     },
//     model2: {
//         label: string,
//         year: number,
    
//     },
//     model3: string,
// };

// /*
// {
//     [K in keyof SOCKET]: {
//         resourceId: SocketResourceId<SOCKET[K]>;
//     }
// }[keyof SOCKET]
// */

// type IN1 = ResourceTypeForValueList<typeof SocketConfig>;
// type IN2 = ResourceTypeForValue<typeof SocketConfig>;

// /*
// const eee = {
//     model1: 'ddd',
//     model2: 44
// };

// type eee1 = typeof eee;

// type eee2 = eee1['model1' | 'model2'];
// */


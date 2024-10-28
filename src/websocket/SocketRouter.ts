import { JSONValue } from "../Json.ts";
import { z } from 'zod';

export class DefValueList<
    R extends JSONValue,
    ID extends JSONValue,
    M extends JSONValue
> {

    private readonly resourceId: z.ZodType<R, z.ZodTypeDef, R>;
    private readonly resp;

    //W razie problemów, tą klasę można zamienić na funkcję, po to żeby nie musieć definioać tych skoplikowanych typów zod

    constructor(resourceId: z.ZodType<R>, idType: z.ZodType<ID>, modelType: z.ZodType<M>) {
        this.resourceId = resourceId;

        this.resp = z.array(z.union([
            z.object({
                type: z.literal('set'),
                id: idType,
                model: modelType,
            }),
            z.object({
                type: z.literal('delete'),
                id: idType,
            }),
        ]));
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

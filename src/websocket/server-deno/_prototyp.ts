import { z } from 'zod';
import { autorun, type IReactionDisposer } from "mobx";
import { assertNever } from "@reactive/utils";
import { PidRecordZod } from "../api/processList/processList.ts";
import type { CreateSubscriptionData, SubscriptionRouter } from "../type.ts";


const aaaZod = {
    'process-list': {
        resourceId: z.object({
            type: z.literal('process-list'),
        }),
        resp: z.record(
            z.string(),
            PidRecordZod
        )
    },
    'aaa': {
        resourceId: z.object({
            type: z.literal('aaa'),
        }),
        resp: z.array(z.number()),
    }
};

//z.ZodType<T>

/*
type RouterState<T extends Record<string, { req: z.ZodType<unknown>, resp: z.ZodType<unknown>}>> = {
    [K in keyof T]: {
        route: K;
        params: T[K] extends Route<infer P> ? P : never;
    }
}[keyof T];
*/


type AAA = CreateSubscriptionData<'aaa', typeof aaaZod>;

//const subscribeTo = 

const startWebsocketApi2 = <T extends SubscriptionRouter>(
    validators: T,
    resourceId: unknown, //subskrybcyjne dane z socketa
    createSubsciption: (data: CreateSubscriptionData<T>) => IReactionDisposer,
): IReactionDisposer => {
    for (const [prefix, { resourceId: resourceIdValidator }] of Object.entries(validators)) {
        const safeData = resourceIdValidator.safeParse(resourceId);

        if (safeData.success) {
            const dispose = createSubsciption({
                type: prefix,
                resourceId: resourceId,
                response: (response) => {

                    //TODO - to wysyłamy do przeglądarki,
                    //trzeba mieć referencję do socketa, oraz id subskrybcji
                    //...
                }
            });

            return dispose;
        }
    }

    throw Error('aaa');
};

startWebsocketApi2(aaaZod, 'ddd', (message) => {

    if (message.type === 'process-list') {

        return autorun(() => {

            //subskrybcja na zewnętrzne źródło danych
            // message.params
            // message.response('aa');

            message.response({
                'a': {
                    'ppid': '',
                    'mem': 'd',
                    'cpu': '',
                    'args': ''
                }
            });

            return () => {

            };
        });
    }

    if (message.type === 'aaa') {
        return autorun(() => {

            //TODO - subskrybcja na zewnętrzne źródło danych

            message.response([99, 0]);


            return () => {

            };
        });
    }

    return assertNever(message);
});





class Konf<K extends string, M extends Record<K, z.ZodType<JSONValue>>> {
    private readonly data: M;

    constructor(data: M) {
        this.data = data;
    }

    public static empty() {
        return new Konf<never, {}>({});
    }

    public add<K2 extends string>(rootId: K2, model: M) {
        const data2 = {
            ...this.data,
            [rootId]: model
        };
    }
}



class Config<K extends string, M extends Record<K, z.ZodType<JSONValue>>> {
    public readonly data: M;

    // public add<NewK extends string>(key: NewK, model: M) {
    //     //TODO
    // }


    constructor(initialData: M) {
        this.data = initialData;
    }

    public static empty() {
        return new Config<never, {}>({});
    }

    // Metoda `add`, która dodaje nowy model i zwraca nowy `Config` z rozszerzonym typem
    public add<NewK extends string, NewM extends z.ZodType<JSONValue>>(
        key: NewK,
        model: NewM
    ): Config<K | NewK, M & Record<NewK, NewM>> {
        return new Config<K | NewK, M & Record<NewK, NewM>>({
            ...this.data,
            [key]: model,
        } /*as M & Record<NewK, NewM>*/);
    }
}

const step0 = Config.empty();
const step1 = step0.add('aaa', z.string());
const step2 = step1.add('bbb', z.number());
const step3 = step2.add('ccc', z.object({
    name: z.string(),
    age: z.number(),
}));

// if (stee3)
const aaa = step3.data.ccc;

const aaa1 = aaa.safeParse('');

if (aaa1.success) {
    const aaa2 = aaa1.data;
}

const congigStep1: Config<{ age: z.ZodType<number>}> = ... jakoś inicjowany ?? TODO

const configStep2: Config<{ age: z.ZodType<number>, name: z.ZodType<string>}> = congigStep1.add('name', z.string());

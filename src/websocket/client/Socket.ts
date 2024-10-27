// import { assertNever, AutoId, EventEmitter, jsonParse, JSONValue, throwError, Value, ValueList, JSONValueZod, stringifySort } from "@reactive/utils";
import { z } from 'zod';
import { WebsocketStream } from "./WebsocketStream.ts";
import { assertNever } from "../../assertNever.ts";
import { AutoId } from "../../AutoId.ts";
import { EventEmitter } from "../../EventEmitter.ts";
import { jsonParse, JSONValue, JSONValueZod, stringifySort } from "../../Json.ts";
import { throwError } from "../../throwError.ts";
import { Value } from "../../Value.ts";
import { ValueList } from "../../ValueList.ts";

type SubscriptionRouter<K extends string> = Record<K, { resourceId: z.ZodType<JSONValue>, resp: z.ZodType<JSONValue>}>;

type ValueListUpdateType<ID extends JSONValue, M extends JSONValue> = {
    type: 'set',
    id: ID,
    model: M
} | {
    type: 'delete',
    id: ID
};

type ValueListIdType<K> = K extends Array<ValueListUpdateType<infer ID, JSONValue>> ? ID : never;
type ValueListModelType<K> = K extends Array<ValueListUpdateType<JSONValue, infer Model>> ? Model : never;

type ResourceId<SRK extends string, SR extends SubscriptionRouter<SRK>> = {
    [K in keyof SR]: {
        resourceId: z.infer<SR[K]['resourceId']>;
    }
}[keyof SR]['resourceId'];

const MessageServerZod = z.union([
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


type SocketStateType<SRK extends string, SR extends SubscriptionRouter<SRK>> = {
    type: 'connected',
    stream: WebsocketStream,
    acctiveIds: Map<number, ResourceId<SRK, SR>>,
} | {
    type: 'idle',
}

export class Socket<SRK extends string, SR extends SubscriptionRouter<SRK>> {
    private readonly autoid: AutoId;
    private connection: SocketStateType<SRK, SR>;
    private eventResetConnection: EventEmitter<void> = new EventEmitter();

    private data: Map<number, (data: JSONValue) => void>;

    constructor(
        private readonly socketRouter: SR,
        private readonly wsHost: string,
    ) {
        this.autoid = new AutoId();
        this.data = new Map();
        this.connection = {
            type: 'idle'
        };
    }

    private processMessage(
        acctiveIds: Map<number, ResourceId<SRK, SR>>,
        stream: WebsocketStream,
        message: MessageEvent<unknown> | null
    ) {
        if (message === null) {
            for (const [id, resourceId] of acctiveIds) {
                stream.send(stringifySort({
                    type: "subscribe",
                    id,
                    resource: resourceId,
                }));
            }

            this.eventResetConnection.trigger();
            return;
        }

        if (typeof message.data !== 'string') {
            console.error('Nieprawidłowy typ wiadomości', message);
            return;
        }

        const messageDate = jsonParse(message.data, MessageServerZod);

        if (messageDate.type === 'ok') {
            if (messageDate.value.type === 'data') {

                const { id, data } = messageDate.value;
                const callbackData = this.data.get(id);

                if (callbackData === undefined) {

                    console.info('brakuje callbackData', {
                        ids: [...this.data.keys()],
                        id
                    })
                } else {
                    callbackData(data);
                }

                return;
            }

            if (messageDate.value.type === 'error-message') {
                console.error('Wiadomość z socket', messageDate.value.message);
                return;
            }

            return assertNever(messageDate.value);
        }

        if (messageDate.type === 'error') {
            console.error('Problem ze zdekodowaniem wiadomości', messageDate.error);
            return;
        }

        return assertNever(messageDate);
    }

    private on(id: number, resourceId: ResourceId<SRK, SR>) {
        if (this.connection.type === 'idle') {
            const stream = new WebsocketStream(this.wsHost, 10_000, false);
            const acctiveIds = new Map();

            acctiveIds.set(id, resourceId);

            this.connection = {
                type: 'connected',
                acctiveIds,
                stream,
            };

            (async () => {
                for await (const message of stream.messages()) {
                    this.processMessage(acctiveIds, stream, message);
                }
            })();

            return;
        }

        this.connection.acctiveIds.set(id, resourceId);
        this.connection.stream.send(stringifySort({
            type: "subscribe",
            id,
            resource: resourceId,
        }));
    }

    private off(id: number) {
        if (this.connection.type === 'idle') {
            console.error('nie można wyłączyć połączenia które jest już wyłączone');
            return;
        }

        this.connection.acctiveIds.delete(id);
        this.connection.stream.send(stringifySort({
            type: "unsubscribe",
            id
        }));

        if (this.connection.acctiveIds.size === 0) {
            this.connection.stream.close();
            this.connection = {
                type: 'idle',
            };
        }
    }

    createValue<K extends SRK, MODEL extends z.infer<SR[K]['resp']> >(
        resourceType: K,
        resourceId: z.infer<SR[K]['resourceId']>,
    ): Value<z.infer<SR[K]['resp']>> {
        const id = this.autoid.get();

        const value = new Value<MODEL | null>(null, () => {
            this.on(id, {
                type: resourceType,
                id: resourceId
            });

            return () => {
                this.off(id);
            };
        });

        const decodeResp = this.socketRouter[resourceType]?.resp ?? throwError('Oczekiwano dekodera, nieosiągalne odgałęzienie');

        this.data.set(id, (data: unknown) => {
            const safeData = decodeResp.safeParse(data);

            if (safeData.success) {
                //@ts-expect-error
                value.setValue(safeData.data);
            } else {
                //@ts-expect-error
                console.info('Problem ze zdekodowaniem danych Value', stringifySort({
                    resourceType,
                    resourceId,
                    data
                }, true));
            }
        });

        return value;
    }

    createValueList<
        K extends SRK,
        ID extends ValueListIdType<z.infer<SR[K]['resp']>>,
        MODEL extends ValueListModelType<z.infer<SR[K]['resp']>>,
    >(
        resourceType: K,
        resourceId: z.infer<SR[K]['resourceId']>,
    ): ValueList<ID, MODEL> {
        const id = this.autoid.get();

        const list = new ValueList<ID, MODEL>(() => {
            this.on(id, {
                type: resourceType,
                id: resourceId
            });

            list.resetOnFirstUpdate();

            const unsubscribe = this.eventResetConnection.on(() => {
                list.resetOnFirstUpdate();
            });

            return () => {
                this.off(id);
                unsubscribe();
            };
        });

        /*
            TODO - przydałby się jakiś status loading
        */

        const decodeResp = this.socketRouter[resourceType]?.resp ?? throwError('Oczekiwano dekodera, nieosiągalne odgałęzienie');

        this.data.set(id, (data: unknown) => {
            const safeData = decodeResp.safeParse(data);

            if (safeData.success) {
                //@ts-expect-error
                list.bulkUpdate(safeData.data);
            } else {
                //@ts-expect-error
                console.info('Problem ze zdekodowaniem danych ValueList', stringifySort({
                    resourceType,
                    resourceId,
                    data
                }, true));
            }
        });

        return list;
    }
}


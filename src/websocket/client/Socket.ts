import { z } from 'zod';
import { WebsocketStream, type WebsocketStreamMessageReceived } from "../../websocketGeneral/WebsocketStream.ts";
import { assertNever } from "../../assertNever.ts";
import { AutoId } from "../../AutoId.ts";
import { EventEmitter } from "../../EventEmitter.ts";
import { JSONValue, JSONValueZod, stringifySort } from "../../Json.ts";
import { Value } from "../../Value.ts";
import { ValueList } from "../../ValueList.ts";
import { DefValue, DefValueList, type ResourceIdAll, type ResourceTypeForValue, type ResourceTypeForValueList, type SocketResourceId, type SocketValueListId, type SocketValueListModel, type SocketValueModel, type SubscriptionRouter } from "../SocketRouter.ts";
import { CheckByZod } from "../../checkByZod.ts";

const messageServerCheck = new CheckByZod('socket messageServerCheck', z.discriminatedUnion('type', [
    z.object({
        type: z.literal('data'),
        id: z.number(),
        data: JSONValueZod,            //dane dotyczące tego konkretnego modelu
    }),
    z.object({
        type: z.literal('error-message'),
        message: z.string(),
    })
]));

type SocketStateType<RTYPE_ALL extends string, SOCKET extends SubscriptionRouter<RTYPE_ALL>> = {
    type: 'connected',
    stream: WebsocketStream,
    acctiveIds: Map<number, {
        type: keyof SOCKET,
        id: ResourceIdAll<SOCKET>
    }>,
} | {
    type: 'idle',
}

export class Socket<RTYPE_ALL extends string, SOCKET extends SubscriptionRouter<RTYPE_ALL>> {
    private readonly autoid: AutoId;
    private connection: SocketStateType<RTYPE_ALL, SOCKET>;
    private eventResetConnection: EventEmitter<void> = new EventEmitter();

    private data: Map<number, (data: JSONValue) => void>;

    constructor(
        private readonly socketRouter: SOCKET,
        private readonly wsHost: string,
    ) {
        this.autoid = new AutoId();
        this.data = new Map();
        this.connection = {
            type: 'idle'
        };
    }

    private processMessage(
        acctiveIds: Map<number, ResourceIdAll<SOCKET>>,
        stream: WebsocketStream,
        message: WebsocketStreamMessageReceived
    ) {
        if (message.type === 'connected') {
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

        if (message.type === 'disconnected') {
            return;
        }

        const messageDate = messageServerCheck.jsonParse(message.data); //, MessageServerZod);

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
            console.error(messageDate.error);
            return;
        }

        return assertNever(messageDate);
    }

    private on<RESOURCE_TYPE extends Exclude<keyof SOCKET, symbol | number>>(id: number, resourceId: {
        type: RESOURCE_TYPE,
        id: ResourceIdAll<SOCKET>
    }) {
        if (this.connection.type === 'idle') {
            const stream = new WebsocketStream(this.wsHost, '', 10_000, false);
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

    createValue<
        RESOURCE_TYPE extends Exclude<ResourceTypeForValue<SOCKET>, symbol | number>,
        MODEL extends SocketValueModel<SOCKET, RESOURCE_TYPE>
    > (
        resourceType: RESOURCE_TYPE,
        resourceId: SocketResourceId<SOCKET[RESOURCE_TYPE]>,
    ): Value<MODEL | null> {                                                //TODO - ten null może się zemścić, lepiej wymienić go na jakiegoś enuma algebraicznego
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

        const decodeResp = this.socketRouter[resourceType];

        if (!(decodeResp instanceof DefValue)) {
            throw Error('Ten typ zasobu nie jest listą');
        }

        this.data.set(id, (data: JSONValue) => {
            const safeData = decodeResp.decodeResp(data);

            if (safeData.type === 'ok') {
                //@ts-expect-error
                value.setValue(safeData.value);
            } else {
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
        RESOURCE_TYPE extends Exclude<ResourceTypeForValueList<SOCKET>, symbol | number>,
        ID extends SocketValueListId<SOCKET, RESOURCE_TYPE>,
        MODEL extends SocketValueListModel<SOCKET, RESOURCE_TYPE>,
    >(
        resourceType: RESOURCE_TYPE,
        resourceId: SocketResourceId<SOCKET[RESOURCE_TYPE]>,
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

        const decodeResp = this.socketRouter[resourceType];
        
        if (!(decodeResp instanceof DefValueList)) {
            throw Error('Ten typ zasobu nie jest DefValueList');
        }

        this.data.set(id, (data: JSONValue) => {
            const safeData = decodeResp.decodeResp(data);

            // const safeData = decodeResp.safeParse(data);

            if (safeData.type === 'ok') {
                //@ts-expect-error
                list.bulkUpdate(safeData.value);
            } else {
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


import { MessageBrowserZod, type MessageBrowserType, type MessageServerType } from "./message.ts";
import { JSONValueZod, stringifySort } from '../../Json.ts';
import { assertNever } from '../../assertNever.ts';
import { websocketToAsyncQuery } from "./websocketToAsyncQuery.ts";
// import type { CreateSubscriptionData, SubscriptionRouter } from "../type.ts";
import { z } from 'zod';
import type { CreateSubscriptionData, DefValue, DefValueList, SubscriptionRouter } from "../SocketRouter.ts";
import type { JSONValue } from "../../../index.ts";

class State {
    private readonly subscription: Map<number, () => void>;

    constructor(private readonly socket: WebSocket) {
        this.subscription = new Map();
    }

    send(message: MessageServerType) {
        this.socket.send(stringifySort(message, true));
    }

    sendError(message: string) {
        this.send({
            type: 'error-message',
            message
        });
    }

    register(id: number, dispose: () => void) {
        const oldDispose = this.subscription.get(id);

        if (oldDispose !== undefined) {
            this.sendError(`Zduplikowany id=${id}, starą subskrybcję anuluję`);
            oldDispose();
        }

        this.subscription.set(id, dispose);
    }

    unregister(id: number) {
        const dispose = this.subscription.get(id);
        this.subscription.delete(id);

        if (dispose === undefined) {
            this.sendError(`Nie można odsubskrybować, brakuje id=${id}`);
            return;
        }

        dispose();
    }

    disposeAll() {
        for (const dispose of this.subscription.values()) {
            dispose();
        }
    }
}

const ResourceIdZod = z.object({
    type: z.string(),
    id: JSONValueZod,
});

//RTYPE_ALL extends string, SOCKET extends SubscriptionRouter<RTYPE_ALL>
const handleSocketMessage = <RTYPE_ALL extends string, SOCKET extends SubscriptionRouter<RTYPE_ALL>>(
    state: State,
    message: MessageBrowserType,
    subscriptionRouter: SOCKET,
    createSubsciption: (data: CreateSubscriptionData<SOCKET, RTYPE_ALL>) => () => void,
): void => {
    if (message.type === 'subscribe') {

        const resourceId_0001 = message.resource;

        const resourceIdSafe = ResourceIdZod.safeParse(resourceId_0001);

        if (resourceIdSafe.success === false) {
            state.sendError(stringifySort({
                message: 'Problem ze zdekodowaniem wiadomości subscribe 1',
                resource: resourceId_0001,
                id: message.id,
            }));
            return;
        }

        const prefix = resourceIdSafe.data.type;

        //@ts-expect-error
        const resourceIdValidator: DefValueList<JSONValue, JSONValue, JSONValue> | DefValue<JSONValue, JSONValue> | undefined = subscriptionRouter[prefix];
        
        if (resourceIdValidator === undefined) {
            state.sendError(stringifySort({
                message: 'Problem ze zdekodowaniem wiadomości subscribe 2',
                resource: resourceId_0001,
                id: message.id,
            }));
            return;
        }

        
        const safeDataId = resourceIdValidator.decodeResourceId(resourceIdSafe.data.id);

        if (safeDataId.type === 'ok') {
            //@ts-expect-error
            const dispose = createSubsciption({
                type: prefix,
                resourceId: safeDataId.value,
                response: (response) => {
                    state.send({
                        type: 'data',
                        id: message.id,
                        data: response
                    });
                }
            });

            // return dispose;
            state.register(message.id, dispose);
            return;
        }

        state.sendError(stringifySort({
            message: 'Problem ze zdekodowaniem wiadomości subscribe 3',
            resource: resourceId_0001,
            id: message.id,
        }));
        return;
    }

    if (message.type === 'unsubscribe') {
        state.unregister(message.id);
        return;
    }

    assertNever(message);
};

interface DenoInterface {
    serve: (params: {
        hostname: string,
        port: number,
        onListen: () => void,
        handler: (req: Request) => Response,
    }) => void,
    upgradeWebSocket: (req: Request) => { socket: WebSocket, response: Response },
}

interface Params<RTYPE_ALL extends string, SOCKET extends SubscriptionRouter<RTYPE_ALL>> {
    deno: DenoInterface,
    hostname: string,
    port: number,
    subscriptionRouter: SOCKET,
    createSubsciption: (data: CreateSubscriptionData<SOCKET, RTYPE_ALL>) => () => void,
}

export const startWebsocketApi = <SRK extends string, SR extends SubscriptionRouter<SRK>>(params: Params<SRK, SR>): void => {
    const { deno, hostname, port, subscriptionRouter, createSubsciption } = params;

    // Deno.serve({
    deno.serve({
        hostname,
        port,
        onListen: () => {
            console.info(`Listening on ws://${hostname}:${port} ... (3)`);
        },
        handler: (req: Request) => {
            const isUpgrade = req.headers.get("upgrade") === "websocket";

            console.info(`REQUEST ${req.url} isUpgrade=${isUpgrade}`);

            if (isUpgrade === false) {
                return new Response(
                    'Hello world',
                    {
                        status: 200
                    }
                );
                // return new Response(null, { status: 501 });
            }

            const { socket, response } = deno.upgradeWebSocket(req);

            (async () => {

                const state = new State(socket);

                for await (const message of websocketToAsyncQuery(socket, MessageBrowserZod).subscribe()) {
                    handleSocketMessage(state, message, subscriptionRouter, createSubsciption);
                }

                state.disposeAll();
            })();

            return response;
        }
    });
};


import { assertNever, AsyncQuery, jsonParse, stringifySort } from "@reactive/utils";
import { z } from 'zod';

export const websocketToAsyncQuery = <T>(socket: WebSocket, validator: z.ZodType<T>): AsyncQuery<T> => {
    const query = new AsyncQuery<T>();

    const timer = setTimeout(() => {
        query.close();
    }, 10_000);

    socket.addEventListener("open", () => {
        console.log("a client connected!");
        clearTimeout(timer);
    });

    socket.addEventListener("message", (event) => {
        if (typeof event.data === 'string') {
            const result = jsonParse(event.data, validator);

            if (result.type === 'ok') {
                query.push(result.value);
                return;
            }

            if (result.type === 'error') {
                socket.send(stringifySort({
                    'type': '',
                    message: result.error
                }));
                return;
            }

            assertNever(result);
        }

        console.info('coś dziwnego dotarło', event.data);
    });

    socket.addEventListener('close', () => {
        console.info('close');
        query.close();
    });

    socket.addEventListener('error', error => {
        console.info('error', error);
        query.close();
    });

    return query;
};

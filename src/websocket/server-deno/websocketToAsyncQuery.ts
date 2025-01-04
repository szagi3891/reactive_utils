import { assertNever, AsyncQuery, JSONValue, stringifySort } from "@reactive/utils";
import { CheckByZod } from "../../checkByZod.ts";

export const websocketToAsyncQuery = <T>(socket: WebSocket, validator: CheckByZod<T>): AsyncQuery<T> => {
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
            const result = validator.jsonParse(event.data);

            if (result.type === 'ok') {
                query.push(result.data);
                return;
            }

            if (result.type === 'error') {
                //@ts-expect-error - Ten typ CheckByZodResult pasuje do JSONValue. Spróbować lepiej to ograć i pozbyć się tego wykluczenia TS
                const message: JSONValue = result.error;

                socket.send(stringifySort({
                    'type': '',
                    message, //: result.error
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

import { AsyncQuery } from "./AsyncQuery.ts";
import { expect } from "jsr:@std/expect";
import { timeout } from "./timeout.ts";

Deno.test('basic', async () => {
    const list: Array<number> = [];
    let abort: boolean = false;

    const query = new AsyncQuery<number>();

    query.onAbort(() => {
        abort = true;
    });

    query.push(3);
    query.push(4);

    expect(abort).toBe(false);
    expect(list).toEqual([]);

    (async () => {
        for await (const message of query.subscribe()) {
            list.push(message);
        }
    })();

    await timeout(0);
    expect(abort).toBe(false);
    expect(list).toEqual([3, 4]);

    query.push(5);
    await timeout(0);
    expect(abort).toBe(false);
    expect(list).toEqual([3, 4, 5]);

    query.close();
    expect(abort).toBe(true);
    expect(list).toEqual([3, 4, 5]);

    query.push(6);
    await timeout(0);

    expect(abort).toBe(true);
    expect(list).toEqual([3, 4, 5]);
});


/*
    zrobić test z dwoma konsumerami
*/

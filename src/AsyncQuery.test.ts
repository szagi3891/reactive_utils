import { AsyncQuery, AsyncQueryIterator } from "./AsyncQuery.ts";
import { expect } from "jsr:@std/expect";
import { timeout } from "./timeout.ts";

const subscribeTo = (query: AsyncQuery<number>, result: Array<number>): AsyncQueryIterator<number> => {
    const iterator = query.subscribe();

    (async () => {
        for await (const message of iterator) {
            result.push(message);
        }
    })();
    
    return iterator;
}

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

    const _sub1 = subscribeTo(query, list);
    // (async () => {
    //     for await (const message of query.subscribe()) {
    //         list.push(message);
    //     }
    // })();

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

Deno.test('multi', async () => {
    const list1: Array<number> = [];
    const list2: Array<number> = [];

    const query = new AsyncQuery<number>();

    const sub1 = subscribeTo(query, list1);
    const sub2 = subscribeTo(query, list2);

    expect(list1).toEqual([]);
    expect(list2).toEqual([]);

    query.push(1);
    await timeout(0);

    expect(list1).toEqual([1]);
    expect(list2).toEqual([]);

    query.push(2);
    await timeout(0);

    expect(list1).toEqual([1]);
    expect(list2).toEqual([2]);

    query.push(3);
    await timeout(0);

    expect(list1).toEqual([1, 3]);
    expect(list2).toEqual([2]);

    query.push(4);
    await timeout(0);

    expect(list1).toEqual([1, 3]);
    expect(list2).toEqual([2, 4]);

    sub2.unsubscribe();

    query.push(5);
    await timeout(0);

    expect(list1).toEqual([1, 3, 5]);
    expect(list2).toEqual([2, 4]);

    query.push(6);
    await timeout(0);

    expect(list1).toEqual([1, 3, 5, 6]);
    expect(list2).toEqual([2, 4]);

    query.push(7);
    await timeout(0);

    expect(list1).toEqual([1, 3, 5, 6, 7]);
    expect(list2).toEqual([2, 4]);

    sub1.unsubscribe();

    query.push(8);
    query.push(9);
    query.push(10);

    expect(list1).toEqual([1, 3, 5, 6, 7]);
    expect(list2).toEqual([2, 4]);

    const list3: Array<number> = [];
    const sub3 = subscribeTo(query, list3);

    await timeout(0);
    expect(list3).toEqual([8, 9, 10]);

    sub3.unsubscribe();
    query.push(11);
    await timeout(0);

    expect(list3).toEqual([8, 9, 10]);
});


/*
    zrobić test z dwoma konsumerami
*/

import { AsyncQuery, AsyncQueryIterator } from "./AsyncQuery.ts";
import { expect } from "jsr:@std/expect";
import { timeout } from "./timeout.ts";
import { Result } from "./Result.ts";

const subscribeTo = <K>(query: AsyncQuery<K>, result: Array<K>): AsyncQueryIterator<K> => {
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

    const sub1 = subscribeTo(query, list);
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

    sub1.unsubscribe();
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


Deno.test('with null', async () => {
    const list: Array<string | null> = [];
    const query = new AsyncQuery();

    const sub = subscribeTo(query, list);

    expect(list).toEqual([]);

    query.push('aa');
    query.push('bb');
    await timeout(0);

    expect(list).toEqual(['aa', 'bb']);

    query.push(null);
    query.push('cc');
    await timeout(0);

    expect(list).toEqual(['aa', 'bb', null, 'cc']);

    query.push('dd');
    query.push('ee');
    await timeout(0);

    expect(list).toEqual(['aa', 'bb', null, 'cc', 'dd', 'ee']);

    sub.unsubscribe();
});
/*
    zrobić test z dwoma konsumerami
*/

Deno.test('AsyncQueryIterator test', async () => {
    const query = new AsyncQuery<string>();
    const list: Array<number> = [];
    let isEnd: boolean = false;

    (async () => {
        const iterator =  query.subscribe().map((value): Result<number, null> => {
            const valueInt = parseInt(value, 10);

            if (isNaN(valueInt)) {
                return Result.error(null);
            }

            return Result.ok(valueInt);
        });

        for await (const message of iterator) {
            list.push(message);
        }

        isEnd = true;
    })();

    expect(list).toEqual([]);
    query.push('ddd');
    await timeout(0);
    expect(list).toEqual([]);
    expect(isEnd).toBe(false);

    query.push('444');
    await timeout(0);
    expect(list).toEqual([444]);
    expect(isEnd).toBe(false);

    query.push('555');
    await timeout(0);
    expect(list).toEqual([444, 555]);
    expect(isEnd).toBe(false);

    query.push('d555');
    await timeout(0);
    expect(list).toEqual([444, 555]);
    expect(isEnd).toBe(false);

    query.push('d555');
    await timeout(0);
    expect(list).toEqual([444, 555]);
    expect(isEnd).toBe(false);

    query.push('d555');
    await timeout(0);
    expect(list).toEqual([444, 555]);
    expect(isEnd).toBe(false);

    query.push('d555');
    await timeout(0);
    expect(list).toEqual([444, 555]);
    expect(isEnd).toBe(false);

    query.push('111111');
    await timeout(0);
    expect(list).toEqual([444, 555, 111111]);
    expect(isEnd).toBe(false);

    query.close();
    await timeout(0);

    expect(list).toEqual([444, 555, 111111]);
    expect(isEnd).toBe(true);
});


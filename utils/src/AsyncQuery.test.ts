import { AsyncQuery, AsyncQueryIterator } from "./AsyncQuery.ts";
import { expect } from "jsr:@std/expect";
import { timeout } from "./timeout.ts";

const subscribeTo = <K>(query: AsyncQuery<K>, result: Array<K>): AsyncQueryIterator<K> => {
    const iterator = query.subscribe();

    (async () => {
        for await (const message of iterator) {
            result.push(message);
        }
    })();
    
    return iterator;
}

Deno.test('basic', () => {

    const abort = new AbortController();
    abort.signal.addEventListener('abort', () => {
        console.info('on abort');
    });

    console.info('aaaa 1');
    expect(abort.signal.aborted).toBe(false);

    console.info('TRIGGER');
    abort.abort();

    console.info('aaaa 2');
    expect(abort.signal.aborted).toBe(true);

});

Deno.test('basic async query', async () => {
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

    subscribeTo(query, list);

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

    subscribeTo(query, list1);
    subscribeTo(query, list2);

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
});


Deno.test('with null', async () => {
    const list: Array<string | null> = [];
    const query = new AsyncQuery();

    subscribeTo(query, list);

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
});

Deno.test('AbortController', async () => {
    const list: Array<number> = [];
    const controller = new AbortController();
    const query = new AsyncQuery<number>(controller);

    subscribeTo(query, list);

    query.push(1);
    await timeout(0);
    expect(list).toEqual([1]);

    expect(query.isOpen()).toBe(true);

    controller.abort();
    
    // Allow abort logic to process
    await timeout(0);

    expect(query.isClose()).toBe(true);
    
    query.push(2);
    await timeout(0);
    
    // Should not receive new items after abort/close
    expect(list).toEqual([1]);
});



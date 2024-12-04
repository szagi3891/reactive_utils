import { expect } from "jsr:@std/expect";
import { ValueList, type ValueListUpdateType } from "./ValueList.ts";
import { timeout } from "./timeout.ts";
import { autorun } from 'mobx';
import { FakeTime } from "jsr:@std/testing/time";

type ID = {
    eventID: string,
    subID: string,
};

type Value = string;

Deno.test('basic', () => {

    const list = new ValueList<ID, Value>();
    
    const replica = new ValueList<ID, Value>();
    list.onChange(data => {
        replica.bulkUpdate(data);
    });


    expect(list.ids).toEqual([]);
    expect(replica.ids).toEqual([]);

    list.set({ eventID: 'a', subID: 'b'}, 'rrr');

    expect(list.ids).toEqual([{ eventID: 'a', subID: 'b'}]);
    expect(replica.ids).toEqual([{ eventID: 'a', subID: 'b'}]);

    list.set({ eventID: 'c', subID: 'd'}, 'ccc');

    expect(list.ids).toEqual([{ eventID: 'a', subID: 'b'}, { eventID: 'c', subID: 'd'}]);
    expect(replica.ids).toEqual([{ eventID: 'a', subID: 'b'}, { eventID: 'c', subID: 'd'}]);


    expect(list.dump()).toEqual([{
        id: {
            eventID: "a",
            subID: "b",
        },
        model: "rrr",
    }, {
        id: {
            eventID: "c",
            subID: "d",
        },
        model: "ccc",
    }]);

    expect(replica.dump()).toEqual([{
        id: {
            eventID: "a",
            subID: "b",
        },
        model: "rrr",
    }, {
        id: {
            eventID: "c",
            subID: "d",
        },
        model: "ccc",
    }]);
    

    //podpięcie nowej repliki powinno sklonować stan
    const replica2 = new ValueList<ID, Value>();
    list.onChange(data => {
        replica2.bulkUpdate(data);
    });

    expect(replica2.dump()).toEqual([{
        id: {
            eventID: "a",
            subID: "b",
        },
        model: "rrr",
    }, {
        id: {
            eventID: "c",
            subID: "d",
        },
        model: "ccc",
    }]);
});

Deno.test('opóźniona replikacja', async () => {
    using time = new FakeTime();

    const main = new ValueList<number, string>(() => {

        // main.resetOnFirstUpdate();

        return () => {
            
        };
    });

    //opóźnienie do replikacji

    const replica = new ValueList<number, string>(() => {

        replica.resetOnFirstUpdate();

        //replica.lazyClear();
        //ustawiamy pusty stan w środku, ale ten stan zostanie dopiero zastosowany, jak zaczną dane spływać

        const unsub = main.onChange(async (data) => {

            await timeout(400);
            replica.bulkUpdate(data);
        });

        return () => {
            unsub();
        };
    });

    const sub = autorun(() => {
        /*const _ids =*/ replica.ids;
    })

    expect(replica.dump()).toEqual([]);
    main.set(1, 'a');

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }]);
    expect(replica.dump()).toEqual([]);

    await time.tickAsync(200);

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }]);
    expect(replica.dump()).toEqual([]);

    await time.tickAsync(300);
    expect(main.dump()).toEqual([{ id: 1, model: 'a' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }]);

    main.set(2, 'b');

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }]);

    await time.tickAsync(200);

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }]);

    await time.tickAsync(300);

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);
    // const list: Array<[number, string]> = [[1, 'a'], [2, 'b'], [3, 'c']];


    sub();

    await time.tickAsync(500);
    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    main.set(3, 'c');

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }, { id: 3, model: 'c' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    await time.tickAsync(200);

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }, { id: 3, model: 'c' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    await time.tickAsync(300);

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }, { id: 3, model: 'c' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    main.set(4, 'd');

    expect(main.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }, { id: 3, model: 'c' }, { id: 4, model: 'd' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    main.delete(1);
    main.set(2, 'bb');

    await time.tickAsync(500);

    expect(main.dump()).toEqual([{ id: 2, model: 'bb' }, { id: 3, model: 'c' }, { id: 4, model: 'd' }]);
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    const sub2 = autorun(() => {
        /*const _aaa =*/ replica.ids;
    });

    await time.tickAsync(200);

    expect(main.dump()).toEqual([{ id: 2, model: 'bb' }, { id: 3, model: 'c' }, { id: 4, model: 'd' }]);
    //Trzyma starą wartość
    expect(replica.dump()).toEqual([{ id: 1, model: 'a' }, { id: 2, model: 'b' }]);

    await time.tickAsync(300);

    expect(main.dump()).toEqual([{ id: 2, model: 'bb' }, { id: 3, model: 'c' }, { id: 4, model: 'd' }]);
    expect(replica.dump()).toEqual([{ id: 2, model: 'bb' }, { id: 3, model: 'c' }, { id: 4, model: 'd' }]);

    sub2();
});

Deno.test('bulk replace', () => {

    const list = new ValueList<number, string>();

    let onChangeData: ValueListUpdateType<number, string>[] | null = null;
    let calls: number = 0;

    list.onChange((data) => {
        onChangeData = data;
        calls += 1;
    });

    expect(calls).toBe(0);

    list.set(2, 'bb');
    list.set(3, 'cc');

    expect(calls).toBe(2);
    expect(list.dump()).toEqual([{
        id: 2,
        model: 'bb',
    }, {
        id: 3,
        model: 'cc',
    }]);

    list.bulkReplace([{
        id: 3,
        model: 'cccc',
    }, {
        id: 4,
        model: 'dd',
    }]);

    expect(onChangeData).toEqual([
        { type: "delete", id: 2 },
        { type: "set", id: 3, model: "cccc" },
        { type: "set", id: 4, model: "dd" }
    ]);

    expect(list.dump()).toEqual([{
        id: 3,
        model: 'cccc',
    }, {
        id: 4,
        model: 'dd',
    }]);

    list.bulkReplace([{
        id: 4,
        model: 'dd',
    }, {
        id: 5,
        model: 'ee',
    }]);

    expect(onChangeData).toEqual([
        { type: "delete", id: 3 },
        { type: "set", id: 5, model: "ee" }
    ]);

    expect(list.dump()).toEqual([{
        id: 4,
        model: 'dd',
    }, {
        id: 5,
        model: 'ee',
    }]);
});

Deno.test('subscribe', async () => {
    using time = new FakeTime();

    let subscribe: boolean = false;

    const list = new ValueList(() => {
        subscribe = true;
        return () => {
            subscribe = false;
        };
    });

    expect(subscribe).toBe(false);

    const sub1 = autorun(() => {
        /*const _ids =*/ list.ids;
    })

    await time.tickAsync(0);
    expect(subscribe).toBe(true);

    sub1();

    await time.tickAsync(0);
    expect(subscribe).toBe(false);

    const sub2 = list.onChange((_data) => {

    });

    await time.tickAsync(0);
    expect(subscribe).toBe(true);

    sub2();

    await time.tickAsync(0);
    expect(subscribe).toBe(false);
});

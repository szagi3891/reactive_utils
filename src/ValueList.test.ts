import { expect } from "jsr:@std/expect";
import { ValueList } from "./ValueList.ts";

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


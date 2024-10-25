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
});


import { AutoMap } from "./AutoMap.ts";
import { expect } from "jsr:@std/expect";

Deno.test('basic', () => {

    let counter = 0;

    class ObjectId {
        protected nominal: 'nominal' = 'nominal';
    
        public static get = AutoMap.create((id: string) => new ObjectId(id));
    
        public constructor(public readonly id: string) {
            counter++;
        }
    }
    
    const aaa = ObjectId.get('aaa');
    const bbb = ['aaa'].map(ObjectId.get);
    const aaa2 = ObjectId.get('aaa');

    expect(counter).toBe(1);
    expect(aaa).toBe(bbb[0]);
    expect(aaa2).toBe(bbb[0]);
});


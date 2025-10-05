import { timeout } from '../timeout.ts';
import { AutoWeakMap, autoWeakMapKey, AutoWeakRef, unregister } from './AutoWeakMap.ts';
import { gc } from '../gc.ts';
import { expect } from "jsr:@std/expect";
import { AllocationCounter } from "./AllocationCounter.ts";
// import v8 from 'node:v8';
// import fs from 'node:fs'; 

class MemoryHelper {
    private registry: FinalizationRegistry<unknown>;
    public readonly logs: Array<unknown> = [];

    public constructor() {
        this.registry = new FinalizationRegistry((objectId) => {
            this.logs.push(objectId);
        });

        this.registry;
    }

    public register(target: WeakKey, heldValue: unknown) {
        this.registry.register(target, heldValue);
    }

    public whenRemoved = async (id: string): Promise<void> => {
        await timeout(0);

        for (let i=0; i<200; i++) {
            if (this.logs.includes(id)) {
                return;
            }
            await timeout(10);
        }

        throw Error(`Object id=${id} not collected`);
    };

    public get removedLength(): number {
        return this.logs.length;
    }
}

Deno.test('MemoryHelper', async () => {
    await gc();

    // if (typeof global.gc !== 'function') {
    //     throw new Error('Garbage collector is not exposed. Run node with --expose-gc.');
    // }

    const data = new WeakMap();

    const memoryHelper = new MemoryHelper();

    (() => {
        const obj = {};
        data.set(obj, 'aaaa');
        memoryHelper.register(obj, 'id1');
    })();

    await gc();
    await memoryHelper.whenRemoved('id1');
});

// const getSnapshot = async (fileSnapshot: string) => {

//     // Otwórz strumień zapisu do pliku
//     const writeStream = fs.createWriteStream(fileSnapshot); //"heap.heapsnapshot"

//     // Pobierz strumień zrzutu sterty
//     const heapSnapshotStream = v8.getHeapSnapshot();

//     // Przekieruj dane bezpośrednio do pliku
//     heapSnapshotStream.pipe(writeStream);

//     const result = Promise.withResolvers<void>();

//     // Opcjonalnie: poczekaj na zakończenie zapisu, aby upewnić się, że program nie zakończy się zbyt wcześnie
//     writeStream.on('finish', () => {
//         console.log("heap.heapsnapshot saved.");

//         return result.resolve();
//     });

//     return result.promise;
// }

Deno.test('memory leak - fix', async () => {
    // if (typeof global.gc !== 'function') {
    //     throw new Error('Garbage collector is not exposed. Run node with --expose-gc.');
    // }

    const counterModel = new AllocationCounter();
    const counterCommon = new AllocationCounter();
    const counterAutoWeakRef = new AllocationCounter();
    
    await (async () => {
        class Common {
            private readonly autoWeakRef: AutoWeakRef;

            [autoWeakMapKey](): AutoWeakRef {
                return this.autoWeakRef;
            }
            constructor(public readonly name: string) {
                this.autoWeakRef = new AutoWeakRef();

                counterAutoWeakRef.up(this.autoWeakRef);

                counterCommon.up(this);
            }
        }

        const Model = class {
            public static get = AutoWeakMap.create((common: Common, id1: string, id2: number) => {
                const model = new Model(common, id1, id2);
                memoryHelper.register(model, `${common.name}-${id1}-${id2}`);
                return model;
            });

            private constructor(private readonly common: Common, private readonly id1: string, private readonly id2: number) {
                counterModel.up(this);
            }

            get name(): string {
                return `Model - ${this.common.name} - ${this.id1} - ${this.id2}`;
            }
        }

        //symulacja, wyciekająych kontekstów do globalnej przestrzeni
        const leakContext: Array<Common> = [];

        const createContext = (name: string): Common => {
            const inst = new Common(name);
            leakContext.push(inst);
            return inst;
        }

        const memoryHelper = new MemoryHelper();


        (() => {
            const common = createContext('CommonI');
            // register(common[autoWeakMapKey]());

            const model1 = Model.get(common, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonI - aaa - 111');

            const model2 = Model.get(common, 'bbb', 222);
            expect(model2.name).toBe('Model - CommonI - bbb - 222');

            const model3 = Model.get(common, 'ccc', 555);
            expect(model3.name).toBe('Model - CommonI - ccc - 555');

            unregister(common[autoWeakMapKey]());
        })();

        await gc();

        expect(AutoWeakMap.counterAutoWeakRef()).toBe(1);
        expect(AutoWeakMap.counterWeakMap()).toBe(1);

    })();

    await gc();

    console.info({
        models: counterModel.getCounter(),
        commons: counterCommon.getCounter(),
        autoWeakRefs: counterAutoWeakRef.getCounter(),

        counterAutoWeakRef: AutoWeakMap.counterAutoWeakRef(),
        counterWeakMap: AutoWeakMap.counterWeakMap(),

    });

    // debugger;

    expect({
        models: counterModel.getCounter(),
        commons: counterCommon.getCounter(),
        autoWeakRefs: counterAutoWeakRef.getCounter(),

        counterAutoWeakRef: AutoWeakMap.counterAutoWeakRef(),
        counterWeakMap: AutoWeakMap.counterWeakMap(),

    }).toEqual({
        models: 0,
        commons: 0,
        autoWeakRefs: 0,

        counterAutoWeakRef: 0,
        counterWeakMap: 0,
    });
});

Deno.test('AutoWeakMap.create', async () => {
    const counterModel = new AllocationCounter();
    const counterCommon = new AllocationCounter();
    const counterAutoWeakRef = new AllocationCounter();
    
    await (async () => {
        class Common {
            private readonly autoWeakRef: AutoWeakRef;

            [autoWeakMapKey](): AutoWeakRef {
                return this.autoWeakRef;
            }
            constructor(public readonly name: string) {
                this.autoWeakRef = new AutoWeakRef();

                counterAutoWeakRef.up(this.autoWeakRef);

                counterCommon.up(this);
            }
        }

        const Model = class {
            public static get = AutoWeakMap.create((common: Common, id1: string, id2: number) => {
                const model = new Model(common, id1, id2);
                memoryHelper.register(model, `${common.name}-${id1}-${id2}`);
                return model;
            });

            private constructor(private readonly common: Common, private readonly id1: string, private readonly id2: number) {
                counterModel.up(this);
            }

            get name(): string {
                return `Model - ${this.common.name} - ${this.id1} - ${this.id2}`;
            }
        }

        //symulacja, wyciekająych kontekstów do globalnej przestrzeni
        const leakContext: Array<Common> = [];

        const createContext = (name: string): Common => {
            const inst = new Common(name);
            leakContext.push(inst);
            return inst;
        }

        const memoryHelper = new MemoryHelper();


        (() => {
            const common = createContext('CommonI');
            // register(common[autoWeakMapKey]());

            const model1 = Model.get(common, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonI - aaa - 111');

            const model2 = Model.get(common, 'bbb', 222);
            expect(model2.name).toBe('Model - CommonI - bbb - 222');

            const model3 = Model.get(common, 'ccc', 555);
            expect(model3.name).toBe('Model - CommonI - ccc - 555');

            unregister(common[autoWeakMapKey]());
        })();

        await gc();
        
        await memoryHelper.whenRemoved('CommonI-aaa-111');
        await memoryHelper.whenRemoved('CommonI-bbb-222');
        await memoryHelper.whenRemoved('CommonI-ccc-555');
        expect(memoryHelper.removedLength).toBe(3);

        (() => {
            const common = createContext('CommonII');
            // register(common[autoWeakMapKey]());

            const model1 = Model.get(common, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonII - aaa - 111');

            const model2 = Model.get(common, 'bbb', 222);
            expect(model2.name).toBe('Model - CommonII - bbb - 222');

            const model3 = Model.get(common, 'ccc', 555);
            expect(model3.name).toBe('Model - CommonII - ccc - 555');
            unregister(common[autoWeakMapKey]());
        })();

        await gc();

        await memoryHelper.whenRemoved('CommonII-aaa-111');
        await memoryHelper.whenRemoved('CommonII-bbb-222');
        await memoryHelper.whenRemoved('CommonII-ccc-555');
        expect(memoryHelper.removedLength).toBe(6);


        (() => {
            const common1 = createContext('CommonIII');
            // register(common1[autoWeakMapKey]());

            const model1 = Model.get(common1, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonIII - aaa - 111');

            const common2 = createContext('CommonIV');
            // register(common2[autoWeakMapKey]());

            const model2 = Model.get(common2, 'aaa', 111);
            expect(model2.name).toBe('Model - CommonIV - aaa - 111');

            expect(counterModel.getCounter()).toBe(2);

            unregister(common1[autoWeakMapKey]());
            unregister(common2[autoWeakMapKey]());
        })();

        expect(AutoWeakMap.counterAutoWeakRef()).toBe(4);
        expect(AutoWeakMap.counterWeakMap()).toBe(1);

        await gc();

        await memoryHelper.whenRemoved('CommonIII-aaa-111');
        await memoryHelper.whenRemoved('CommonIV-aaa-111');

        expect(memoryHelper.removedLength).toBe(8);

    })();

    await gc();

    expect(counterModel.getCounter()).toBe(0);
    expect(counterCommon.getCounter()).toBe(0);
    expect(counterAutoWeakRef.getCounter()).toBe(0);
    expect(AutoWeakMap.counterAutoWeakRef()).toBe(0);
    expect(AutoWeakMap.counterWeakMap()).toBe(0);           //jeśli sama struktura weakmapy nie będzie się dealokować to nie ma tragedii

});

import { timeout } from '../timeout.ts';
import { AutoWeakMap, autoWeakMapKey, AutoWeakRef } from './AutoWeakMap.ts';
import { gc } from '../gc.ts';
import { expect } from "jsr:@std/expect";
import { AllocationCounter } from "./AllocationCounter.ts";
// import v8 from 'node:v8';
// import fs from 'node:fs'; 

class MemoryHelper {
    private registry: FinalizationRegistry<unknown>;
    public readonly logs: Array<string> = [];

    public constructor() {
        this.registry = new FinalizationRegistry<string>((objectId) => {
            this.logs.push(objectId);
        });

        this.registry;
    }

    public register(target: WeakKey, heldValue: string) {
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

class Common {
    public static counterCommon = new AllocationCounter();

    private readonly autoWeakRef: AutoWeakRef;

    [autoWeakMapKey](): AutoWeakRef {
        return this.autoWeakRef;
    }

    public readonly deref: () => void;

    constructor(public readonly name: string) {

        const [ref, deref] = AutoWeakRef.create();

        this.autoWeakRef = ref;
        this.deref = deref;

        Common.counterCommon.up(this);
    }

    public static getCounter(): number {
        return Common.counterCommon.getCounter();
    }
}


class LeakContext {
    private leakContext: Array<Common> = [];

    createContext(name: string): Common {
        const inst = new Common(name);
        this.leakContext.push(inst);
        return inst;
    }

    clean() {
        this.leakContext = [];
    }
}


Deno.test('memory leak - fix', async () => {
    const counterModel = new AllocationCounter();
    
    // console.info('ROZPOCZNINJ NAGRYWANIE');
    debugger;

    await (async () => {
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
        const leakContext = new LeakContext();

        const memoryHelper = new MemoryHelper();


        (() => {
            const common = leakContext.createContext('CommonI');

            const model1 = Model.get(common, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonI - aaa - 111');

            const model2 = Model.get(common, 'bbb', 222);
            expect(model2.name).toBe('Model - CommonI - bbb - 222');

            const model3 = Model.get(common, 'ccc', 555);
            expect(model3.name).toBe('Model - CommonI - ccc - 555');

            common.deref();
        })();

        await gc();


        console.info('liczniki', {
            models: counterModel.getCounter(),
            commons: Common.getCounter(),
            counterAutoWeakRef: AutoWeakRef.objectCounter(),
        });

        expect({
            models: counterModel.getCounter(),
            commons: Common.getCounter(),
            counterAutoWeakRef: AutoWeakRef.objectCounter(),
        }).toEqual({
            models: 0,
            commons: 1,                 //Symulacja wycieku common do pamięci. Modele powinny się zwolnić
            counterAutoWeakRef: 1,
        });

        leakContext.clean();
    })();

    await gc();


    console.info('liczniki', {
        models: counterModel.getCounter(),
        commons: Common.getCounter(),
        counterAutoWeakRef: AutoWeakRef.objectCounter(),
    });

    // console.info('ZATRZYMAJ NAGRYWANIE');
    debugger;


    //TODO - tutaj te wycieki pamięci powinny zniknąć

    expect({
        models: counterModel.getCounter(),
        commons: Common.getCounter(),
        counterAutoWeakRef: AutoWeakRef.objectCounter(),
    }).toEqual({
        models: 0,
        commons: 0,
        counterAutoWeakRef: 0,
    });
});

Deno.test('AutoWeakMap.create', async () => {
    const counterModel = new AllocationCounter();
    const counterCommon = new AllocationCounter();
    
    await (async () => {
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
        const leakContext = new LeakContext();

        const memoryHelper = new MemoryHelper();

        // console.info('ROZPOCZNINJ NAGRYWANIE');
        debugger;

        (() => {
            const common = leakContext.createContext('CommonI');
            // register(common[autoWeakMapKey]());

            const model1 = Model.get(common, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonI - aaa - 111');

            const model2 = Model.get(common, 'bbb', 222);
            expect(model2.name).toBe('Model - CommonI - bbb - 222');

            const model3 = Model.get(common, 'ccc', 555);
            expect(model3.name).toBe('Model - CommonI - ccc - 555');

            common.deref();
        })();

        await gc();

        console.info(memoryHelper.logs);

        await memoryHelper.whenRemoved('CommonI-aaa-111');
        await memoryHelper.whenRemoved('CommonI-bbb-222');
        await memoryHelper.whenRemoved('CommonI-ccc-555');
        expect(memoryHelper.removedLength).toBe(3);

        (() => {
            const common = leakContext.createContext('CommonII');
            // register(common[autoWeakMapKey]());

            const model1 = Model.get(common, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonII - aaa - 111');

            const model2 = Model.get(common, 'bbb', 222);
            expect(model2.name).toBe('Model - CommonII - bbb - 222');

            const model3 = Model.get(common, 'ccc', 555);
            expect(model3.name).toBe('Model - CommonII - ccc - 555');
            common.deref();
        })();

        await gc();

        await memoryHelper.whenRemoved('CommonII-aaa-111');
        await memoryHelper.whenRemoved('CommonII-bbb-222');
        await memoryHelper.whenRemoved('CommonII-ccc-555');
        expect(memoryHelper.removedLength).toBe(6);


        (() => {
            const common1 = leakContext.createContext('CommonIII');
            // register(common1[autoWeakMapKey]());

            const model1 = Model.get(common1, 'aaa', 111);
            expect(model1.name).toBe('Model - CommonIII - aaa - 111');

            const common2 = leakContext.createContext('CommonIV');
            // register(common2[autoWeakMapKey]());

            const model2 = Model.get(common2, 'aaa', 111);
            expect(model2.name).toBe('Model - CommonIV - aaa - 111');

            expect(counterModel.getCounter()).toBe(2);

            common1.deref();
            common2.deref();
        })();

        await gc();

        // console.info('ZATRZYMAJ NAGRYWANIE');
        debugger;

        expect(AutoWeakRef.objectCounter()).toBe(4);
        // expect(AutoWeakMap.objectCounter()).toBe(1);

        await gc();

        await memoryHelper.whenRemoved('CommonIII-aaa-111');
        await memoryHelper.whenRemoved('CommonIV-aaa-111');

        expect(memoryHelper.removedLength).toBe(8);

        leakContext.clean();
    })();

    await gc();

    expect(counterModel.getCounter()).toBe(0);
    expect(counterCommon.getCounter()).toBe(0);
    expect(AutoWeakRef.objectCounter()).toBe(0);
    // expect(AutoWeakMap.objectCounter()).toBe(0);           //jeśli sama struktura weakmapy nie będzie się dealokować to nie ma tragedii

});

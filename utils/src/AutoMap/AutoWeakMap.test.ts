import { timeout } from '../timeout.ts';
import { AutoWeakMap, autoWeakMapKey, AutoWeakRef, unregister } from './AutoWeakMap.ts';
import { gc } from '../gc.ts';
import { expect } from "jsr:@std/expect";

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
    gc();

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

    gc();
    await memoryHelper.whenRemoved('id1');
});

Deno.test('AutoWeakMap.create', async () => {
    // if (typeof global.gc !== 'function') {
    //     throw new Error('Garbage collector is not exposed. Run node with --expose-gc.');
    // }

    class Common {
        private readonly autoWeakRef: AutoWeakRef;

        [autoWeakMapKey](): AutoWeakRef {
            return this.autoWeakRef;
        }
        constructor(public readonly name: string) {
            this.autoWeakRef = new AutoWeakRef();
        }
    }

    class Model {
        public static get = AutoWeakMap.create((common: Common, id1: string, id2: number) => {
            const model = new Model(common, id1, id2);
            memoryHelper.register(model, `${common.name}-${id1}-${id2}`);
            return model;
        });

        private constructor(private readonly common: Common, private readonly id1: string, private readonly id2: number) {}

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

    gc();
    
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

    gc();

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

        unregister(common1[autoWeakMapKey]());
        unregister(common2[autoWeakMapKey]());
    })();

    gc();
    
    await memoryHelper.whenRemoved('CommonIII-aaa-111');
    await memoryHelper.whenRemoved('CommonIV-aaa-111');

    expect(memoryHelper.removedLength).toBe(8);
});

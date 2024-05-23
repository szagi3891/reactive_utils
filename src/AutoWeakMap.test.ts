import { expect, test } from 'vitest';
import { timeout } from './timeout';
import { AutoWeakMap, autoWeakMapKey } from './AutoWeakMap';

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

test('MemoryHelper', async () => {
    if (typeof global.gc !== 'function') {
        throw new Error('Garbage collector is not exposed. Run node with --expose-gc.');
    }

    const data = new WeakMap();

    const memoryHelper = new MemoryHelper();

    (() => {
        const obj = {};
        data.set(obj, 'aaaa');
        memoryHelper.register(obj, 'id1');
    })();

    global.gc();
    await memoryHelper.whenRemoved('id1');
});

test('AutoWeakMap.create', async () => {
    if (typeof global.gc !== 'function') {
        throw new Error('Garbage collector is not exposed. Run node with --expose-gc.');
    }

    class Common {
        [autoWeakMapKey](): void {}
        constructor(public readonly name: string) {}
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

    const memoryHelper = new MemoryHelper();


    (() => {
        const common = new Common('CommonI');
        memoryHelper.register(common, 'CommonI');

        const model1 = Model.get(common, 'aaa', 111);
        expect(model1.name).toBe('Model - CommonI - aaa - 111');

        const model2 = Model.get(common, 'bbb', 222);
        expect(model2.name).toBe('Model - CommonI - bbb - 222');

        const model3 = Model.get(common, 'ccc', 555);
        expect(model3.name).toBe('Model - CommonI - ccc - 555');
    })();

    global.gc();
    
    await memoryHelper.whenRemoved('CommonI');
    await memoryHelper.whenRemoved('CommonI-aaa-111');
    await memoryHelper.whenRemoved('CommonI-bbb-222');
    await memoryHelper.whenRemoved('CommonI-ccc-555');
    expect(memoryHelper.removedLength).toBe(4);

    (() => {
        const common = new Common('CommonII');
        memoryHelper.register(common, 'CommonII');

        const model1 = Model.get(common, 'aaa', 111);
        expect(model1.name).toBe('Model - CommonII - aaa - 111');

        const model2 = Model.get(common, 'bbb', 222);
        expect(model2.name).toBe('Model - CommonII - bbb - 222');

        const model3 = Model.get(common, 'ccc', 555);
        expect(model3.name).toBe('Model - CommonII - ccc - 555');
    })();

    global.gc();

    await memoryHelper.whenRemoved('CommonII');
    await memoryHelper.whenRemoved('CommonII-aaa-111');
    await memoryHelper.whenRemoved('CommonII-bbb-222');
    await memoryHelper.whenRemoved('CommonII-ccc-555');
    expect(memoryHelper.removedLength).toBe(8);
});

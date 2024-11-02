import { expect } from "jsr:@std/expect/expect";
import { AutoWeakMap, autoWeakMapKey } from "./AutoWeakMap.ts";
import { autoMapKeyAsString } from "./PrimitiveType.ts";

export class Common {
    protected nominal: 'nominal' = 'nominal';
    public constructor(
    ) {
        AutoWeakMap.register(this);        
    }

    [autoWeakMapKey](): void {
    }
}

export class PathModel {
    public readonly type: 'PathModel' = 'PathModel';
    public static get = AutoWeakMap.create((common: Common, path: Array<string>) => new PathModel(common, path));

    [autoMapKeyAsString](): Array<string> {
        console.info('konwersja do stringa');
        return this.path;
    }

    private constructor(
        private readonly common: Common,
        public readonly path: Array<string>,
    ) {
    }
}


Deno.test('reduceComplexSymbol', () => {
    const common = new Common();

    const path1 = PathModel.get(common, ['a']);
    const path2 = PathModel.get(common, ['a']);

    expect(path1).toBe(path2);
});


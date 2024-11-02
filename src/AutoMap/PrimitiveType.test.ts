import { expect } from "jsr:@std/expect/expect";
import { AutoWeakMap, autoWeakMapKey } from "./AutoWeakMap.ts";
import { autoMapKeyAsString, reduceComplexSymbol } from "./PrimitiveType.ts";

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
        return this.path;
    }

    private constructor(
        private readonly common: Common,
        public readonly path: Array<string>,
    ) {
    }
}

export class PathContentModel {
    public readonly type: 'PathContentModel' = 'PathContentModel';

    public static get = AutoWeakMap.create((common: Common, path: PathModel, sha: string) => new PathContentModel(common, path, sha));

    public static root(common: Common): PathContentModel {
        const ROOT_FAKE_SHA = 'root-fake-sha';
        return PathContentModel.get(common, PathModel.get(common, []), ROOT_FAKE_SHA);
    }

    private constructor(
        private readonly common: Common,
        private readonly path: PathModel,
        _sha: string,
    ) {
    }
}

Deno.test('reduceComplexSymbol', () => {
    const common = new Common();

    const path1 = PathModel.get(common, ['a']);
    const path2 = PathModel.get(common, ['a']);

    expect(path1).toBe(path2);

    const content1 = PathContentModel.get(common, path1, '');
    const content2 = PathContentModel.get(common, path2, '');

    expect(content1).toBe(content2);

    expect(reduceComplexSymbol([path1, 'aaa'])).toEqual([
        [ "a" ],
        "aaa",
    ]);
});


import { AutoWeakMap } from "./AutoMap/AutoWeakMap.ts";


/**
 * 
 * Example:
 * 
 * 
 * import { autoWeakMapKey, ContextEnv, ContextModel } from "@reactive/utils";
 * 
 * 
 * interface ProcessParamsType {
 *     url: string,
 * }
 * 
 * 
 * class Common {
 *     constructor(public readonly params: ProcessParamsType) {
 * 
 *     }
 * 
 *     [autoWeakMapKey](): void {
 *     }
 * }
 * 
 * 
 * const contextEnv = new ContextEnv();
 * const context = React.createContext<ContextModel<Common> | null>(null);
 * 
 * 
 * export const useCommon = (): Common => {
 *     const state = React.useContext(context);
 * 
 *     if (state === null) {
 *         throw Error('Missing provider from Common');
 *     }
 * 
 *     return state.common;
 * };
 * 
 * 
 * export const CommonWrapper = ({ children, paramsConfig }: { children: ReactNode, paramsConfig: ProcessParamsType }) => {    
 *     return (
 *         <context.Provider value={contextEnv.getFromBrowserCacheOrCreate(() => new Common(paramsConfig))}>
 *             {children}
 *         </context.Provider>
 *     );
 * };
 * 
 */

export class ContextEnv<Common extends WeakKey> {
    public readonly registryDrop: FinalizationRegistry<() => void>;

    public globalContextModel: ContextModel<Common> | null = null;

    constructor() {
        this.registryDrop = new FinalizationRegistry((callback) => {
            callback();
        });
    }

    private getFromBrowserCacheOrCreateContext(create: () => ContextModel<Common>): ContextModel<Common> {
        if (typeof window === 'undefined') {
            return create();
        }

        if (this.globalContextModel !== null) {
            return this.globalContextModel;
        }

        this.globalContextModel = create();
        return this.globalContextModel;
    }

    public getFromBrowserCacheOrCreate(create: () => Common): ContextModel<Common> {
        return this.getFromBrowserCacheOrCreateContext(() => {
            return new ContextModel(
                this.registryDrop,
                create()
            );
        })
    }
}

export class ContextModel<Common extends WeakKey> {
    constructor(
        registryDrop: FinalizationRegistry<() => void>,
        public readonly common: Common
    ) {
        registryDrop.register(this, () => {
            AutoWeakMap.unregister(common);
        });
    }
}

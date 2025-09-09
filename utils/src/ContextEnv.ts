import { AutoWeakMap } from "./AutoMap/AutoWeakMap.ts";
import * as React from 'react';

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
 * const contextEnv = new ContextEnv<Common>();
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

class ContextEnv<Common extends WeakKey> {
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

class ContextModel<Common extends WeakKey> {
    constructor(
        registryDrop: FinalizationRegistry<() => void>,
        public readonly common: Common
    ) {
        registryDrop.register(this, () => {
            AutoWeakMap.unregister(common);
        });
    }
}

interface CreateCommonReturnType<ProcessParamsType, Common extends WeakKey> {
    useCommon: () => Common,
    ProviderCommon: (props: { children: React.ReactNode, paramsConfig: ProcessParamsType }) => React.ReactElement,
}

export const createCommon = <ProcessParamsType, Common extends WeakKey>(create: (params: ProcessParamsType) => Common): CreateCommonReturnType<ProcessParamsType, Common> => {
    const contextEnv = new ContextEnv<Common>();
    const context = React.createContext<ContextModel<Common> | null>(null);

    const useCommon = (): Common => {
        const state = React.useContext(context);

        if (state === null) {
            throw Error('Missing provider from Common');
        }

        return state.common;
    };

    const ProviderCommon = ({ children, paramsConfig }: { children: React.ReactNode, paramsConfig: ProcessParamsType }) => {    

        const common = contextEnv.getFromBrowserCacheOrCreate(() => create(paramsConfig));

       return React.createElement(
            context.Provider,
            {
                value: common,
            },
            children
        );
    };

    return {
        useCommon,
        ProviderCommon
    }
};

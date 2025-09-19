import { AutoWeakRef, unregister, register } from "./AutoMap/AutoWeakMap.ts";
import * as React from 'react';

class ContextModel {
    constructor(
        registryDrop: FinalizationRegistry<() => void>,
        public readonly autoWeakRef: AutoWeakRef
    ) {
        register(autoWeakRef);

        registryDrop.register(this, () => {
            unregister(autoWeakRef);
        });
    }
}


const envInit = (): (() => ContextModel) => {
    const registryDrop: FinalizationRegistry<() => void> = new FinalizationRegistry((callback) => {
        callback();
    });

    let globalContextModel: ContextModel | null = null;

    return (): ContextModel => {
        if (typeof window === 'undefined') {
            return new ContextModel(
                registryDrop,
                new AutoWeakRef()
            );;
        }

        if (globalContextModel !== null) {
            return globalContextModel;
        }

        globalContextModel = new ContextModel(
            registryDrop,
            new AutoWeakRef()
        );

        return globalContextModel;
    }
}

const contextEnv = envInit();

interface CreateCommonReturnType<C> {
    useAutoWeakRef: () => C,
    ProviderAutoWeakRef: (props: {
        children: React.ReactNode,
        create: (autoWeakRef: AutoWeakRef) => C
    }) => React.ReactElement,
}

export const createAutoWeakRef = <C>(): CreateCommonReturnType<C> => {
    const context = React.createContext<{
        contextModel: ContextModel,
        value: C,
    } | null>(null);

    const useAutoWeakRef = (): C => {
        const state = React.useContext(context);

        if (state === null) {
            throw Error('Missing provider from autoWeakRef');
        }

        return state.value;
    };

    const ProviderAutoWeakRef = ({ children, create }: { children: React.ReactNode, create: (autoWeakRef: AutoWeakRef) => C }) => {
        const contextModel = contextEnv();
        const value = create(contextModel.autoWeakRef);

        return React.createElement(
            context.Provider,
            {
                value: {
                    contextModel,
                    value,
                },
            },
            children
        );
    };

    return {
        useAutoWeakRef,
        ProviderAutoWeakRef
    }
};

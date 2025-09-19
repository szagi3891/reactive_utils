import { AutoWeakMap, AutoWeakRef } from "./AutoMap/AutoWeakMap.ts";
import * as React from 'react';

class ContextModel {
    constructor(
        registryDrop: FinalizationRegistry<() => void>,
        public readonly autoWeakRef: AutoWeakRef
    ) {
        registryDrop.register(this, () => {
            AutoWeakMap.unregister(autoWeakRef);
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

interface CreateCommonReturnType {
    useAutoWeakRef: () => AutoWeakRef,
    ProviderAutoWeakRef: (props: { children: React.ReactNode }) => React.ReactElement,
}

export const createAutoWeakRef = (): CreateCommonReturnType => {
    const contextEnv = envInit();
    const context = React.createContext<ContextModel | null>(null);

    const useAutoWeakRef = (): AutoWeakRef => {
        const state = React.useContext(context);

        if (state === null) {
            throw Error('Missing provider from autoWeakRef');
        }

        return state.autoWeakRef;
    };

    const ProviderAutoWeakRef = ({ children }: { children: React.ReactNode }) => {
        return React.createElement(
            context.Provider,
            {
                value: contextEnv(),
            },
            children
        );
    };

    return {
        useAutoWeakRef,
        ProviderAutoWeakRef
    }
};

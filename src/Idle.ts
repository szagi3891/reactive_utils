import * as React from 'react';
import { Resource, ResourceResult } from './Resource';

type UnsubscribeType = () => void;
type Callback = () => void;

type Id = {};

class Idle {
    private readonly request: Set<Id>;
    private callback: Map<Id, Callback>;

    public constructor() {
        this.request = new Set();
        this.callback = new Map();
    }

    private refresh = (): void => {
        if (this.request.size === 0) {
            
            const callback = this.callback;
            this.callback = new Map();
            for (const callbackItem of callback.values()) {
                console.info('callback iddle run');
                callbackItem();
            }
        }

    };

    public registerNetworRequest = (): UnsubscribeType => {
        const id: Id = {};

        this.request.add(id);
        console.info(`request count=${this.request.size}`);

        return (): void => {
            this.request.delete(id);
            console.info(`request count=${this.request.size}`);
            this.refresh();
        };
    };

    public whenIddle = (callback: Callback): UnsubscribeType => {
        const id: Id = {};
        this.callback.set(id, callback);

        //wait 0.5s
        const unregisterTimeoutCounter = registerNetworRequest();

        setTimeout(() => {
            unregisterTimeoutCounter();
        }, 500);

        //wait for DOMContentLoaded
        const unregisterContentLoaded = registerNetworRequest();

        window.addEventListener('DOMContentLoaded', unregisterContentLoaded);
        setTimeout(unregisterContentLoaded, 3000);
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            unregisterContentLoaded();
        }

        
        this.refresh();

        return () => {
            this.callback.delete(id);
        };
    };
}

const idle: Idle = new Idle();

export const registerNetworRequest = idle.registerNetworRequest;

export const whenIddle = idle.whenIddle;

export const ssrReactLazy = <T>(load: () => Promise<React.ComponentType<T>>): React.LazyExoticComponent<React.ComponentType<T>> => {
    return React.lazy(async () => {
        const unregister = idle.registerNetworRequest();
        const component = await load();
        unregister();

        return {
            default: component
        };
    });
};

const isServer = (): boolean => typeof window === 'undefined';

export class ResourceSSR<T> {
    private originalResource: Resource<T>;

    public constructor(loadValue: () => Promise<T>) {
        this.originalResource = new Resource(loadValue);
    }

    public get(ssr: boolean): ResourceResult<T> {
        if (ssr === false && isServer()) {
            return {
                type: 'loading',
                whenReady: new Promise(() => {}),
            };
        }

        const result = this.originalResource.get();

        if (result.type === 'loading' && ssr) {
            if (isServer()) {
                throw result.whenReady;
            } else {
                const unsubscribe = idle.registerNetworRequest();

                result
                    .whenReady
                    .then(() => {
                        unsubscribe();
                    })
                    .catch(() => {
                        unsubscribe();
                    });
            }
        }

        return result;
    }

    public getReady(ssr: boolean): T | null {
        const result = this.get(ssr);

        if (result.type === 'ready') {
            return result.value;
        }

        return null;
    }

    public async refresh(): Promise<void> {
        await this.originalResource.refresh();
    }
}

/* eslint-disable */
import { PromiseBox, Result } from '@reactive/utils';
import type { Worker } from 'node:worker_threads';
import { parentPort } from 'node:worker_threads';

type Request<P> = {
    id: number,
    method: string,
    params: P,
};

type InitRequest<D> = {
    type: 'INIT',
    data: D,
};

type Response<R> = {
    id: number,
    response: Result<R, string>,
}

const getId = (() => {

    let id = 1;

    return () => {
        try {
            return id;
        } finally {
            id += 1;
        }
    }
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MethodsObject = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WorkerFactory<InitData, Methods extends MethodsObject> = (initData: InitData) => Methods;

// Extract init data type from worker module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractInitData<T> = T extends { default: WorkerFactory<infer D, any> } ? D : never;

// Extract methods object type from worker module
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExtractMethods<T> = T extends { default: WorkerFactory<any, infer M> } ? M : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class WorkerWrapper<FT extends { default: WorkerFactory<any, any> }> {
    private readonly worker: Worker;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private readonly response: Map<number, PromiseBox<any>>;

    constructor(
        worker: Worker,
        initData: ExtractInitData<FT>,
    ) {
        this.worker = worker;
        this.response = new Map();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        worker.on("message", async (response: Response<any>) => {
            const box = this.response.get(response.id);
            this.response.delete(response.id);

            if (box === undefined) {
                throw Error('panic');
            }

            if (response.response.type === 'ok') {
                box.resolve(response.response.data);
            } else {
                box.reject(response.response.error);
            }
        });

        // Send init data to worker
        const initRequest: InitRequest<ExtractInitData<FT>> = {
            type: 'INIT',
            data: initData,
        };
        this.worker.postMessage(initRequest);
    }


    private async exec<K extends keyof ExtractMethods<FT>>(
        method: K,
        ...params: Parameters<ExtractMethods<FT>[K]>
    ): Promise<Awaited<ReturnType<ExtractMethods<FT>[K]>>> {
        const id = getId();
        const responseBox = new PromiseBox<Awaited<ReturnType<ExtractMethods<FT>[K]>>>();
        this.response.set(id, responseBox);

        console.info('set id', id, 'method', method);

        const request: Request<Parameters<ExtractMethods<FT>[K]>> = {
            id,
            method: method as string,
            params,
        };

        this.worker.postMessage(request);

        return responseBox.promise;
    }

    async terminate(): Promise<number> {
        const code = await this.worker.terminate();
        return code;
    }

    public get proxy(): ExtractMethods<FT> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        return new Proxy({}, {
            get: (_target, prop) => {
                return (...args: any[]) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return self.exec(prop as any, ...(args as any));
                };
            }
        }) as ExtractMethods<FT>;
    }
}


export const installWorker = <InitData, T extends MethodsObject>(
    factory: WorkerFactory<InitData, T>
): WorkerFactory<InitData, T> => {

    if (parentPort === null) {
        throw Error('Oczekiwano interfejsu workera 1');
    }

    let methods: T | null = null;

    parentPort.on("message", async (msg: Request<unknown[]> | InitRequest<InitData>) => {

        if (parentPort === null) {
            throw Error('Oczekiwano interfejsu workera 2');
        }

        // Handle initialization
        if ('type' in msg && msg.type === 'INIT') {
            methods = factory(msg.data);
            return;
        }

        // Handle method calls
        if (!methods) {
            throw Error('Worker not initialized - INIT message must be sent first');
        }

        // At this point, msg is Request<unknown[]>
        const request = msg as Request<unknown[]>;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const method = (methods as any)[request.method];

            if (!method) {
                throw Error(`Method ${request.method} not found in worker`);
            }

            const result = await method.call(methods, ...request.params);
            const response: Response<unknown> = {
                id: request.id,
                response: Result.ok(result),
            };

            parentPort.postMessage(response);
        } catch (error) {
            console.info('error przetwarzania metody w workerze', error);

            const errorResponse: Response<unknown> = {
                id: request.id,
                response: Result.error(error instanceof Error ? error.message : String(error)),
            };

            parentPort.postMessage(errorResponse);
        }
    });

    return factory;
};

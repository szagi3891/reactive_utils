import { PromiseBox } from '@reactive/utils';
import type { Worker } from 'node:worker_threads';
import { isMainThread, threadId, parentPort } from 'node:worker_threads';

type Request<P> = {
    id: number,
    params: P,
};

type Response<R> = {
    id: number,
    response: R,
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
export class WorkerWrapper<FT extends { default: (...arg1: any[]) => Promise<any> }> {
    private readonly worker: Worker;
    private readonly response: Map<number, PromiseBox<Awaited<ReturnType<FT['default']>>>>;

    constructor(
        worker: Worker,
    ) {
        this.worker = worker;
        this.response = new Map();

        console.trace('WorkerWrapper - Tworzę konstruktor', {isMainThread, threadId});

        worker.on("message", (response: Response<Awaited<ReturnType<FT['default']>>>) => {

            const box = this.response.get(response.id);
            this.response.delete(response.id);

            if (box === undefined) {
                throw Error('panic');
            }

            box.resolve(response.response);
        });
    }


    exec(...params: Parameters<FT['default']>): Promise<Awaited<ReturnType<FT['default']>>> {
        const id = getId();
        const responseBox = new PromiseBox<Awaited<ReturnType<FT['default']>>>();
        this.response.set(id, responseBox);

        console.info('set id', id);

        const request: Request<Parameters<FT['default']>> = {
            id,
            params,
        };

        this.worker.postMessage(request);

        return responseBox.promise;
    }

    async terminate(): Promise<number> {
        const code = await this.worker.terminate();
        return code;
    }
}


export const installWorker = <P extends unknown[], R>(callback: (...param: P) => Promise<R>): ((...param: P) => Promise<R>) => {
    
    console.trace('WorkerWrapper - installWorker', {isMainThread, threadId});

    if (parentPort === null) {
        throw Error('Oczekiwano interfejsu workera 1');
    }

    parentPort.on("message", async (msg: Request<P>) => {

        if (parentPort === null) {
            throw Error('Oczekiwano interfejsu workera 2');
        }

        console.info('msg ===>', msg);

        const fff = await callback(...msg.params);
        const responsse: Response<R> = {
            id: msg.id,
            response: fff,
        }; 

        parentPort.postMessage(responsse);
    });

    return callback;
};


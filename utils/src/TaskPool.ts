import { Stream } from "./Stream.ts";
import { PromiseBox } from "./PromiseBox.ts";
import { timeout } from "./timeout.ts";

const createTask = <RESOURCE, R>(task: (page: RESOURCE) => Promise<R>): [(page: RESOURCE) => Promise<void>, Promise<R>] => {
    const response = new PromiseBox<R>();

    const taskBox = async (page: RESOURCE) => {
        const responseValue = await task(page);
        response.resolve(responseValue);
    };

    return [taskBox, response.promise];
};

const execTask = async <RESOURCE>(
    retryCount: number,
    task: (page: RESOURCE) => Promise<void>,
    resource: RESOURCE | null,
    createResource: () => Promise<RESOURCE>
): Promise<RESOURCE | null> => {
    let currentResource: RESOURCE | null = resource;

    for (let i = 1; i <= retryCount; i++) {
        try {
            currentResource ??= await createResource();
            await task(currentResource);
            return currentResource;
        } catch {
            currentResource = null;
            await timeout(5000);
        }
    }

    return currentResource;
};

const startWorker = async <RESOURCE>(
    retryCount: number,
    stream: Stream<(page: RESOURCE) => Promise<void>>,
    createResource: () => Promise<RESOURCE>
) => {
    let resource: RESOURCE | null = null;

    for await (const task of stream.readable) {
        resource = await execTask(retryCount, task, resource, createResource);
    }
};

export class TaskPool<RESOURCE> {
    private readonly stream: Stream<(page: RESOURCE) => Promise<void>>;

    constructor(size: number, retryCount: number, createResource: () => Promise<RESOURCE>) {
        this.stream = new Stream();

        for (let i=1; i<=size; i++) {
            startWorker(retryCount, this.stream, createResource).catch(console.error);
        }
    }

    public execScenario<R>(scenario: (page: RESOURCE) => Promise<R>): Promise<R> {
        const [task, result] = createTask(scenario);

        this.stream.push(task);
        return result;
    }

    public static async execScenarioList<R, P>(task: number, retryCount: number, list: Array<P>, scenario: (param: P) => Promise<R>): Promise<Array<R>> {
        const pool = new TaskPool(task, retryCount, () => Promise.resolve(null));

        try {
            const tasks: Array<Promise<R>> = [];

            for (const param of list) {
                const task = pool.execScenario((_resource) => {
                    return scenario(param);
                });

                tasks.push(task);
            }

            const result = await Promise.all(tasks);
            return result;

        } finally {
            pool.stream.close();
        }
    }
}


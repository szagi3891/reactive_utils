import { AsyncQuery } from "./AsyncQuery.ts";
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
    task: (page: RESOURCE) => Promise<void>,
    resource: RESOURCE | null,
    createResource: () => Promise<RESOURCE>
): Promise<RESOURCE> => {
    let currentResource: RESOURCE = resource ?? (await createResource());

    while (true) {
        try {
            await task(currentResource);
            return currentResource;
        } catch {
            currentResource = await createResource();
            await timeout(5000);
        }
    }
};

const startWorker = async <RESOURCE>(
    query: AsyncQuery<(page: RESOURCE) => Promise<void>>,
    createResource: () => Promise<RESOURCE>
) => {
    let resource: RESOURCE | null = null;

    for await (const task of query.subscribe()) {
        resource = await execTask(task, resource, createResource);
    }
};


export class TaskPool<RESOURCE> {
    private readonly query: AsyncQuery<(page: RESOURCE) => Promise<void>>;

    constructor(size: number, createResource: () => Promise<RESOURCE>) {
        this.query = new AsyncQuery();

        for (let i=1; i<=size; i++) {
            startWorker(this.query, createResource).catch(console.error);
        }
    }

    public execScenario<R>(scenario: (page: RESOURCE) => Promise<R>): Promise<R> {
        const [task, result] = createTask(scenario);

        this.query.push(task);
        return result;
    }

    public static async execScenarioList<R, P>(task: number, list: Array<P>, scenario: (param: P) => Promise<R>): Promise<Array<R>> {
        const pool = new TaskPool(task, async () => null);

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
            pool.query.close();
        }
    }
}

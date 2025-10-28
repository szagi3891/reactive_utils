import { AsyncQuery, PromiseBox } from "@reactive/utils";

const createTask = <RESOURCE, R>(task: (page: RESOURCE) => Promise<R>): [(page: RESOURCE) => Promise<void>, Promise<R>] => {
    const response = new PromiseBox<R>();

    const taskBox = async (page: RESOURCE) => {
        const responseValue = await task(page);
        response.resolve(responseValue);
    };

    return [taskBox, response.promise];
};

export class TaskPool<RESOURCE> {
    private readonly query: AsyncQuery<(page: RESOURCE) => Promise<void>>;

    constructor() {
        this.query = new AsyncQuery();
    }

    public addWorkerResource(resource: RESOURCE) {
        (async () => {
            const consumer = this.query.subscribe();

            try {
                for await (const task of consumer) {
                    await task(resource);
                }
            } finally {
                consumer.unsubscribe();
            }
        })().catch(console.error);
    }

    public execScenario<R>(scenario: (page: RESOURCE) => Promise<R>): Promise<R> {

        const [task, result] = createTask(scenario);

        this.query.push(task);
        return result;
    }

    public async execScenarioList<R, P>(list: Array<P>, scenario: (page: RESOURCE, param: P) => Promise<R>): Promise<Array<R>> {
        const tasks: Array<Promise<R>> = [];

        for (const param of list) {
            const task = this.execScenario((page) => {
                return scenario(page, param);
            });

            tasks.push(task);
        }

        const result = await Promise.all(tasks);
        return result;
    }
}

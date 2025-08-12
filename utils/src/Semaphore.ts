import { PromiseBox } from './PromiseBox.ts';

export class Semaphore {
    private currentTask: number = 0;
    private queue: Array<PromiseBox<() => void>>;

    public constructor(private readonly maxLock: number) {
        this.queue = [];
    }

    public acquire(): Promise<() => void> {
        const box = new PromiseBox<() => void>();
        this.queue.push(box);
        setTimeout(this.refresh, 0);
        return box.promise;
    }

    private refresh = (): void => {
        if (this.currentTask >= this.maxLock) {
            return;
        }

        const task = this.queue.shift();

        if (task === undefined) {
            return;
        }

        let isUnlockExecute = false;
        this.currentTask += 1;

        task.resolve((): void => {
            if (isUnlockExecute === true) {
                return;
            }

            isUnlockExecute = true;
            this.currentTask -= 1;
            setTimeout(this.refresh, 0);
        });
    };
}
import { PromiseBox } from "@reactive/utils";

const assert = (logicalCondition: boolean, label: string) => {
    if (logicalCondition) {
        return;
    }

    throw Error(label);
};

interface WaitingItem {
    desiredState: boolean,
    promise: PromiseBox<void>,
}

export class OnlineSemafor {

    private onlineFlag: boolean;
    private visibleFlag: boolean;

    private waitingFor: Array<WaitingItem> = [];

    constructor() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined' || typeof document === 'undefined') {
            this.onlineFlag = false;
            this.visibleFlag = false;
            return;
        }

        this.onlineFlag = navigator.onLine;
        this.visibleFlag = document.visibilityState === 'visible';

        window.addEventListener('online', this.onlineFn);
        window.addEventListener('offline', this.offlineFn);
        document.addEventListener('visibilitychange', this.visibilityChangeFn);
    }

    public get online(): boolean {
        return this.onlineFlag && this.visibleFlag;
    }

    private readonly onlineFn = () => {
        assert(navigator.onLine === true, 'Rozjazd navigator.onLine, oczekiwano true');
        this.onlineFlag = true;

        this.recalculate();
    };

    private readonly offlineFn = () => {
        assert(navigator.onLine === false, 'Rozjazd navigator.onLine, oczekiwano false');
        this.onlineFlag = false;

        this.recalculate();
    };

    private readonly visibilityChangeFn = () => {
        this.visibleFlag = document.visibilityState === 'visible';

        this.recalculate();
    }

    public dispose() {
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return;
        }

        window.removeEventListener('online', this.onlineFn);
        window.removeEventListener('offline', this.offlineFn);
        document.removeEventListener('visibilitychange', this.visibilityChangeFn);
    }

    public async waitFor(state: boolean): Promise<void> {
        if (this.onlineFlag === state) {
            return;
        }

        const result = new PromiseBox<void>();
        this.waitingFor.push({
            desiredState: state,
            promise: result,
        });
        return result.promise;
    }

    private recalculate() {
        const currentWaiting = [...this.waitingFor];
        const waitingFor = [];

        for (const item of currentWaiting   ) {
            if (item.desiredState === this.online) {
                item.promise.resolve();
            } else {
                waitingFor.push(item);
            }
        }

        this.waitingFor = waitingFor;
    }
}
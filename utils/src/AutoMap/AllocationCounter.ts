
// import { whenDrop } from "./whenDrop.ts";


export class AllocationCounter<T extends WeakKey> {
    private counter: number = 0;

    registryDrop: FinalizationRegistry<void>;

    constructor(private readonly whenChange?: (counter: number) => void) {
        this.registryDrop = new FinalizationRegistry(() => {
            this.change(-1);
        });
    }

    change(delta: number) {
        this.counter += delta;

        if (this.whenChange !== undefined) {
            this.whenChange(this.counter);
        }
    }

    up(target: T) {
        this.registryDrop.register(target, undefined);
        this.change(1);
    }

    getCounter(): number {
        return this.counter;
    }
}

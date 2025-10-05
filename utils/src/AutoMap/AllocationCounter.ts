
const counterFinalizationRegistry: FinalizationRegistry<() => void> = new FinalizationRegistry((callback) => {
    callback();
});

export class AllocationCounter<T extends WeakKey> {
    private counter: number = 0;

    constructor(private readonly whenChange?: (counter: number) => void) {
    }
    private down = () => {
        this.counter--;

        if (this.whenChange !== undefined) {
            this.whenChange(this.counter);
        }
    }

    up(target: T) {
        this.counter++;
        counterFinalizationRegistry.register(target, this.down)

        if (this.whenChange !== undefined) {
            this.whenChange(this.counter);
        }
    }

    getCounter(): number {
        return this.counter;
    }
}

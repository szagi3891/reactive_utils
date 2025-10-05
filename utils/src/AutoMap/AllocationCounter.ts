
const counterFinalizationRegistry: FinalizationRegistry<() => void> = new FinalizationRegistry((callback) => {
    callback();
});

export class AllocationCounter<T extends WeakKey> {
    private counter: number = 0;

    private down = () => {
        this.counter--;
    }

    up(target: T) {
        this.counter++;
        counterFinalizationRegistry.register(target, this.down)
    }

    getCounter(): number {
        return this.counter;
    }
}

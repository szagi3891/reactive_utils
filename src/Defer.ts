export class Defer {
    private constructor(private callback: () => Promise<void>) {}

    static from(callback: () => Promise<void>): Defer {
        return new Defer(callback)
    }

    async [Symbol.asyncDispose](): Promise<void> {
        await this.callback();
    }
}


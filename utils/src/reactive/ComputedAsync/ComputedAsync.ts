import { Computed, Signal } from '@reactive/utils';
import type { Result } from '@reactive/utils';
import { autorun, untracked, _allowStateReadsEnd, _allowStateReadsStart } from 'mobx';
import { z } from 'zod';

export type Snapshot<K> =
    | { status: 'value'; value: K; fetching: boolean }
    | SnapshotErrorOrLoading;

export type RefreshMode = 'keep' | 'replace';

export type SnapshotError = {
    message: string;
    refresh: (mode?: RefreshMode) => void;
};

export type SnapshotErrorOrLoading =
    | { status: 'loading' }
    | {
        status: 'error';
        jsRuntime: boolean;
        error: SnapshotError;
    };

const SnapshotErrorZod = z.object({
    message: z.string(),
    refresh: z.custom<(mode?: RefreshMode) => void>((value) => typeof value === 'function'),
});

const SnapshotErrorOrLoadingZod = z.discriminatedUnion('status', [
    z.object({
        status: z.literal('loading'),
    }),
    z.object({
        status: z.literal('error'),
        jsRuntime: z.boolean(),
        error: SnapshotErrorZod,
    }),
]);

/** Rzucony przez `unbox` — `catch` rozpoznaje po tym symbolu, nie po `status`. */
const unboxThrown = Symbol('ComputedAsync.unbox');

const UnboxThrownZod = z.object({
    [unboxThrown]: SnapshotErrorOrLoadingZod,
});

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

const unwrapUnbox = (
    error: unknown,
    refresh: (mode?: RefreshMode) => void,
): SnapshotErrorOrLoading => {
    const parsed = UnboxThrownZod.safeParse(error);
    if (!parsed.success) {
        return {
            status: 'error',
            jsRuntime: error instanceof Error,
            error: {
                message: toErrorMessage(error),
                refresh,
            },
        };
    }

    return parsed.data[unboxThrown];
};

const throwUnbox = (snapshot: SnapshotErrorOrLoading): never => {
    throw {
        [unboxThrown]: snapshot,
    };
};

export type SnapshotSource<T> = {
    get(): Snapshot<T>;
    refresh?(mode?: RefreshMode): void;
};

export type Unbox = <K>(dep: SnapshotSource<K>) => K;

type SourceRefresh = (mode?: RefreshMode) => void;

const sourceRefreshOf = <T>(dep: SnapshotSource<T>): SourceRefresh | undefined => {
    const refresh = dep.refresh;
    if (refresh === undefined) {
        return undefined;
    }

    return (mode) => {
        refresh.call(dep, mode);
    };
};

const createUnbox = (): {
    unbox: Unbox;
    revoke: () => void;
    sawFetching: boolean;
    sources: SourceRefresh[];
} => {
    let active = true;
    let sawFetching = false;
    const sources: SourceRefresh[] = [];
    const seen = new Set<object>();

    const unbox: Unbox = (dep) => {
        if (!active) {
            throw new Error('ComputedAsync.unbox() można wołać tylko w callbacku ComputedAsync.from / computeAsync');
        }

        const result = dep.get();

        if (result.status === 'value') {
            if (result.fetching) {
                sawFetching = true;
            }

            const refresh = sourceRefreshOf(dep);
            if (refresh !== undefined && !seen.has(dep)) {
                seen.add(dep);
                sources.push(refresh);
            }

            return result.value;
        }

        return throwUnbox(result);
    };

    return {
        unbox,
        revoke: () => {
            active = false;
        },
        get sawFetching() {
            return sawFetching;
        },
        sources,
    };
};

type RuntimeSide = 'browser' | 'server';

const currentSide = (): RuntimeSide =>
    typeof window === 'undefined' ? 'server' : 'browser';

const snapshotWhileFetching = <T>(current: Snapshot<T>): Snapshot<T> => {
    if (current.status === 'value') {
        return {
            status: 'value',
            value: current.value,
            fetching: true,
        };
    }

    return { status: 'loading' };
};

const errorSnapshot = <T>(
    message: string,
    refresh: (mode?: RefreshMode) => void,
    jsRuntime: boolean,
): Snapshot<T> => ({
    status: 'error',
    jsRuntime,
    error: {
        message,
        refresh,
    },
});

const snapshotFromResult = <T>(
    result: Result<T, string>,
    refresh: (mode?: RefreshMode) => void,
): Snapshot<T> => {
    if (result.type === 'ok') {
        return {
            status: 'value',
            value: result.data,
            fetching: false,
        };
    }

    return errorSnapshot(result.error, refresh, false);
};

type AsyncTask<T> = () => Promise<Result<T, string>>;

/** API `ComputedAsync.browser` / `ComputedAsync.server`. */
export type ComputedAsyncSide = {
    fromAsync<T>(run: () => Promise<Result<T, string>>): ComputedAsync<T>;
    computeAsync<T>(
        createTask: (unbox: Unbox) => () => Promise<Result<T, string>>,
    ): ComputedAsync<T>;
};

class FromAsyncRuntime<T> {
    /** Id bieżącego requestu. Stary Promise odpada, gdy `requestId` się zmieni (nowy tick / disconnect). */
    private requestId = 0;
    /** Sztuczna zależność: `refresh()` podbija tick, gdy nie odświeżył źródeł. */
    private readonly bump = Signal.create<number>(0);
    /** Źródła z ostatniego udanego `unbox`. Przy wartości `refresh` woła je wszystkie. */
    private sources: SourceRefresh[] = [];
    /** Reaktywny snapshot. `onConnect` startuje autorun, cleanup go gasi. */
    private readonly state: Signal<Snapshot<T>>;

    constructor(
        private readonly createTask: (unbox: Unbox) => AsyncTask<T>,
    ) {
        this.state = Signal.create<Snapshot<T>>({ status: 'loading' }, () => this.connect());
    }

    read(): Snapshot<T> {
        return this.state.get();
    }

    refresh = (mode: RefreshMode = 'keep'): void => {
        untracked(() => {
            const prevAllowStateReads = _allowStateReadsStart(true);
            try {
            const snapshot = this.state.get();
            if (snapshot.status === 'value') {
                for (const sourceRefresh of this.sources) {
                    sourceRefresh(mode);
                }
            }

            if (mode === 'replace') {
                this.state.set({ status: 'loading' });
            }

            if (snapshot.status === 'value' && this.sources.length > 0) {
                return;
            }

            this.bump.set(this.bump.get() + 1);
            } finally {
                _allowStateReadsEnd(prevAllowStateReads);
            }
        });
    };

    private connect(): () => void {
        const dispose = autorun(() => this.tick());
        return () => {
            this.requestId += 1;
            dispose();
        };
    }

    private tick(): void {
        this.bump.get();
        const scoped = createUnbox();

        try {
            const task = this.createTask(scoped.unbox);
            this.sources = scoped.sources;
            const id = ++this.requestId;
            const depsFetching = scoped.sawFetching;
            this.state.set(snapshotWhileFetching(untracked(() => this.state.get())));
            this.startRun(id, task, depsFetching);
        } catch (error) {
            this.requestId += 1;
            this.state.set(unwrapUnbox(error, this.refresh));
        } finally {
            scoped.revoke();
        }
    }

    private startRun(id: number, task: AsyncTask<T>, depsFetching: boolean): void {
        try {
            const promise = untracked(() => {
                const prevAllowStateReads = _allowStateReadsStart(false);
                try {
                    return task();
                } finally {
                    _allowStateReadsEnd(prevAllowStateReads);
                }
            });
            void this.watchPromise(id, promise, depsFetching);
        } catch (error) {
            this.onSettled(id, unwrapUnbox(error, this.refresh), depsFetching);
        }
    }

    private async watchPromise(
        id: number,
        promise: Promise<Result<T, string>>,
        depsFetching: boolean,
    ): Promise<void> {
        try {
            const result = await promise;
            this.onSettled(id, snapshotFromResult(result, this.refresh), depsFetching);
        } catch (caught: unknown) {
            this.onSettled(id, unwrapUnbox(caught, this.refresh), depsFetching);
        }
    }

    private onSettled(id: number, snapshot: Snapshot<T>, depsFetching: boolean): void {
        if (id !== this.requestId) {
            return;
        }

        if (depsFetching && snapshot.status === 'value') {
            this.state.set({
                status: 'value',
                value: snapshot.value,
                fetching: true,
            });
            return;
        }

        this.state.set(snapshot);
    }
}

/**
 * Nakładka na Computed<{@link Snapshot}>.
 *
 * Trzy stany: value | loading | error. Jedyny odczyt to `get()` — snapshot.
 * `fetching` jest tylko na wartości i oznacza odświeżanie przy starej wartości
 * (`refresh('keep')`). Pierwsze ładowanie to `status: 'loading'`, bez flagi.
 *
 * `get()` przy `fromAsync` i `computeAsync` nigdy nie rzuca — wolno go używać ze zwykłego Computed i z Reacta.
 * Przy `from` własny wyjątek wylatuje z `get()` i wywala obserwatora.
 * Wyciąganie wartości z loading/error jest tylko przez `unbox` przekazany do
 * {@link ComputedAsync.from} / {@link ComputedAsync.computeAsync}.
 * `unbox` przy `fetching` zwraca starą wartość; `from` ustawia `fetching` na wyniku.
 */
export class ComputedAsync<T> {
    private constructor(
        private readonly inner: Computed<Snapshot<T>>,
        private readonly refreshFn: (mode?: RefreshMode) => void = () => {},
    ) {}

    private static finish<T>(
        side: RuntimeSide | undefined,
        createTask: (unbox: Unbox) => AsyncTask<T>,
    ): ComputedAsync<T> {
        if (side !== undefined && currentSide() !== side) {
            return new ComputedAsync(
                Computed.initShallow(() => ({ status: 'loading' })),
            );
        }

        const runtime = new FromAsyncRuntime(createTask);

        return new ComputedAsync(
            Computed.initShallow(() => runtime.read()),
            runtime.refresh,
        );
    }

    private static gate(side: RuntimeSide): ComputedAsyncSide {
        return {
            fromAsync<T>(run: AsyncTask<T>): ComputedAsync<T> {
                return ComputedAsync.finish(side, () => run);
            },

            computeAsync<T>(createTask: (unbox: Unbox) => AsyncTask<T>): ComputedAsync<T> {
                return ComputedAsync.finish(side, createTask);
            },
        };
    }

    static readonly browser: ComputedAsyncSide = ComputedAsync.gate('browser');
    static readonly server: ComputedAsyncSide = ComputedAsync.gate('server');

    /**
     * Synchronizacja. `refresh` tylko odświeża źródła z `unbox`.
     * Błąd z `unbox` zostawia `refresh` źródła.
     * Własny wyjątek wylatuje z computeda.
     */
    static from<T>(getValue: (unbox: Unbox) => T): ComputedAsync<T> {
        let sources: SourceRefresh[] = [];
        let latest: Snapshot<T> = { status: 'loading' };
        const refresh = (mode: RefreshMode = 'keep'): void => {
            untracked(() => {
                const prevAllowStateReads = _allowStateReadsStart(true);
                try {
                    if (latest.status !== 'value') {
                        return;
                    }

                    for (const sourceRefresh of sources) {
                        sourceRefresh(mode);
                    }
                } finally {
                    _allowStateReadsEnd(prevAllowStateReads);
                }
            });
        };

        return new ComputedAsync(
            Computed.initShallow((): Snapshot<T> => {
                const scoped = createUnbox();

                try {
                    latest = {
                        status: 'value',
                        value: getValue(scoped.unbox),
                        fetching: scoped.sawFetching,
                    };
                    sources = scoped.sources;
                    return latest;
                } catch (error) {
                    const parsed = UnboxThrownZod.safeParse(error);
                    if (!parsed.success) {
                        throw error;
                    }

                    latest = parsed.data[unboxThrown];
                    return latest;
                } finally {
                    scoped.revoke();
                }
            }),
            refresh,
        );
    }

    /**
     * Uruchamia request przy pierwszej obserwacji. Zniknięcie observerów
     * zatrzymuje autorun i in-flight Promise, ale zostawia ostatnią wartość —
     * ponowna obserwacja odświeża w trybie `keep`, bez wracania do loading.
     *
     * Sam fetch: `fromAsync(async () => Result.ok(...))` — task w `untracked`
     * z wyłączonym `allowStateReads`.
     * Zależności: `computeAsync((unbox) => () => Promise)` — zewnętrzna funkcja
     * w autorun, zwrócony task w `untracked`.
     * Strona: `.browser` / `.server` przed `fromAsync` / `computeAsync`;
     * mismatch = loading bez wołania callbacków.
     *
     * `refresh('keep')` (domyślnie) zostawia starą wartość z `fetching: true`.
     * Refresh ze snapshotu `error` od razu wchodzi w `loading` i startuje nowy request.
     * `refresh('replace')` kasuje snapshot do `loading`. Zmiana zależności
     * zostawia starą wartość (`fetching`), tak jak reconnect.
     * Koniec własnego requestu nie gasi `fetching`, dopóki zależność z `unbox`
     * nadal jedzie.
     */
    static fromAsync<T>(run: AsyncTask<T>): ComputedAsync<T> {
        return ComputedAsync.finish(undefined, () => run);
    }

    /**
     * Zewnętrzna funkcja jest śledzona i zwraca task. Odczyty Signala i `unbox`
     * należą do niej. Zwrócona funkcja async leci w `untracked`.
     */
    static computeAsync<T>(createTask: (unbox: Unbox) => AsyncTask<T>): ComputedAsync<T> {
        return ComputedAsync.finish(undefined, createTask);
    }

    refresh(mode: RefreshMode = 'keep'): void {
        this.refreshFn(mode);
    }

    /**
     * Snapshot. Przy `fromAsync` i `computeAsync` bez wyjątku;
     * przy `from` własny wyjątek wylatuje stąd i wywala obserwatora.
     * Ze zwykłego Computed / UI zawsze to, nigdy `unbox` z from.
     */
    get(): Snapshot<T> {
        return this.inner.get();
    }
}

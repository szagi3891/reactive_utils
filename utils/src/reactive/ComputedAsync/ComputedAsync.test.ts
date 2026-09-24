import { expect } from "jsr:@std/expect";
import { autorun, _allowStateReadsEnd, _allowStateReadsStart } from 'mobx';
import { Result, Signal, timeout } from '@reactive/utils';
import { ComputedAsync } from './ComputedAsync.ts';
import type { Snapshot } from './ComputedAsync.ts';

const peek = <T>(ext: ComputedAsync<T>): Snapshot<T> => {
    const prevAllowStateReads = _allowStateReadsStart(true);
    try {
        return ext.get();
    } finally {
        _allowStateReadsEnd(prevAllowStateReads);
    }
};

const observe = <T>(ext: ComputedAsync<T>): { current: () => Snapshot<T>; dispose: () => void } => {
    const dispose = autorun(() => {
        ext.get();
    });

    return {
        current: () => peek(ext),
        dispose,
    };
};

const waitFor = async (
    pred: () => boolean,
    label: string,
): Promise<void> => {
    for (let i = 0; i < 200; i++) {
        if (pred()) {
            return;
        }

        await timeout(1);
    }

    throw new Error(`timeout: ${label}`);
};

const valueOf = <T>(value: T, fetching = false): Snapshot<T> => ({
    status: 'value',
    value,
    fetching,
});

Deno.test('from: zwraca wartość synchronicznie', () => {
    const ext = ComputedAsync.from(() => 2 + 2);

    expect(peek(ext)).toEqual(valueOf(4));
});

Deno.test('from: get() nie rzuca — zwykły odczyt dostaje snapshot', () => {
    const pending = ComputedAsync.fromAsync(() => Promise.withResolvers<Result<number, string>>().promise);
    const doubled = ComputedAsync.from((unbox) => unbox(pending) * 2);

    expect(peek(doubled)).toEqual({ status: 'loading' });
});

Deno.test('from: unbox spłaszcza loading i potem wartość', async () => {
    const box = Promise.withResolvers<Result<number, string>>();
    const source = ComputedAsync.fromAsync(async () => {
        return box.promise;
    });
    const doubled = ComputedAsync.from((unbox) => unbox(source) * 2);
    const sub = observe(doubled);

    expect(sub.current()).toEqual({ status: 'loading' });

    box.resolve(Result.ok(21));
    await waitFor(() => sub.current().status === 'value', 'doubled value');

    expect(sub.current()).toEqual(valueOf(42));
    sub.dispose();
});

Deno.test('from: unbox spłaszcza error i zachowuje refresh źródła', async () => {
    let calls = 0;
    const source = ComputedAsync.fromAsync(async () => {
        calls += 1;
        if (calls === 1) {
            return Result.error('boom');
        }

        return Result.ok(7);
    });
    const doubled = ComputedAsync.from((unbox) => unbox(source) * 2);
    const sub = observe(doubled);

    await waitFor(() => sub.current().status === 'error', 'source error');

    const snapshot = sub.current();
    if (snapshot.status !== 'error') {
        throw new Error('expected error');
    }

    expect(snapshot.jsRuntime).toBe(false);
    snapshot.error.refresh();
    await waitFor(() => sub.current().status === 'value', 'refresh after error');

    expect(sub.current()).toEqual(valueOf(14));
    expect(calls).toBe(2);
    sub.dispose();
});

Deno.test('from: refresh przy wartości odświeża wszystkie źródła', async () => {
    let leftCalls = 0;
    let rightCalls = 0;
    const left = ComputedAsync.fromAsync(async () => {
        leftCalls += 1;
        return Result.ok(1);
    });
    const right = ComputedAsync.fromAsync(async () => {
        rightCalls += 1;
        return Result.ok(2);
    });
    const sum = ComputedAsync.from((unbox) => unbox(left) + unbox(right));
    const sub = observe(sum);

    await waitFor(() => sub.current().status === 'value', 'sum ready');
    expect(leftCalls).toBe(1);
    expect(rightCalls).toBe(1);

    sum.refresh();
    await waitFor(() => leftCalls === 2 && rightCalls === 2, 'both sources refreshed');

    expect(sub.current()).toEqual(valueOf(3));
    sub.dispose();
});

Deno.test('from: refresh przy wartości nie przelicza pochodnej drugi raz', async () => {
    const next = Promise.withResolvers<Result<number, string>>();
    let sourceLoads = 0;
    const source = ComputedAsync.fromAsync(async () => {
        sourceLoads += 1;
        if (sourceLoads === 1) {
            return Result.ok(1);
        }

        return next.promise;
    });
    let runs = 0;
    const doubled = ComputedAsync.from((unbox) => {
        runs += 1;
        return unbox(source) * 2;
    });
    const sub = observe(doubled);

    await waitFor(() => sub.current().status === 'value', 'doubled ready');
    const runsAtValue = runs;

    doubled.refresh();

    expect(sourceLoads).toBe(2);
    expect(runs).toBe(runsAtValue + 1);
    expect(sub.current()).toEqual(valueOf(2, true));
    sub.dispose();
});

Deno.test('from: refresh błędu ponawia tylko źródło tego błędu', async () => {
    let leftCalls = 0;
    let rightCalls = 0;
    const left = ComputedAsync.fromAsync(async () => {
        leftCalls += 1;
        return Result.ok(1);
    });
    const right = ComputedAsync.fromAsync(async () => {
        rightCalls += 1;
        if (rightCalls === 1) {
            return Result.error('boom');
        }

        return Result.ok(2);
    });
    const sum = ComputedAsync.from((unbox) => unbox(left) + unbox(right));
    const sub = observe(sum);

    await waitFor(() => sub.current().status === 'error', 'right error');

    const snapshot = sub.current();
    if (snapshot.status !== 'error') {
        throw new Error('expected error');
    }

    snapshot.error.refresh();
    await waitFor(() => sub.current().status === 'value', 'right recovered');

    expect(leftCalls).toBe(1);
    expect(rightCalls).toBe(2);
    expect(sub.current()).toEqual(valueOf(3));
    sub.dispose();
});

Deno.test('from: czeka na oba źródła', async () => {
    const leftBox = Promise.withResolvers<Result<number, string>>();
    const rightBox = Promise.withResolvers<Result<number, string>>();
    const left = ComputedAsync.fromAsync(async () => {
        return leftBox.promise;
    });
    const right = ComputedAsync.fromAsync(async () => {
        return rightBox.promise;
    });
    const sum = ComputedAsync.from((unbox) => unbox(left) + unbox(right));
    const sub = observe(sum);

    expect(sub.current()).toEqual({ status: 'loading' });

    leftBox.resolve(Result.ok(1));
    await timeout(5);
    expect(sub.current()).toEqual({ status: 'loading' });

    rightBox.resolve(Result.ok(2));
    await waitFor(() => sub.current().status === 'value', 'sum value');

    expect(sub.current()).toEqual(valueOf(3));
    sub.dispose();
});

Deno.test('from: nieoczekiwany wyjątek wylatuje z computed', () => {
    const ext = ComputedAsync.from(() => {
        throw new Error('boom');
    });

    expect(() => peek(ext)).toThrow('boom');
});

Deno.test('from: obiekt z status loading bez symbolu wylatuje z computed', () => {
    const ext = ComputedAsync.from(() => {
        throw { status: 'loading' };
    });

    let thrown: unknown;
    try {
        peek(ext);
    } catch (error) {
        thrown = error;
    }

    expect(thrown).toEqual({ status: 'loading' });
});

Deno.test('unbox zapisany poza from nie działa', () => {
    let stolen: ((dep: ComputedAsync<number>) => number) | null = null;
    const source = ComputedAsync.from(() => 1);

    peek(ComputedAsync.from((unbox) => {
        stolen = unbox;
        return unbox(source);
    }));

    expect(stolen).not.toBeNull();
    expect(() => stolen!(source)).toThrow('można wołać tylko w callbacku');
});

Deno.test('fromAsync: Result.ok kończy się wartością', async () => {
    const ext = ComputedAsync.fromAsync(async () => {
        return Result.ok('ok');
    });
    const sub = observe(ext);

    expect(sub.current()).toEqual({ status: 'loading' });

    await waitFor(() => sub.current().status === 'value', 'async ok');
    expect(sub.current()).toEqual(valueOf('ok'));
    sub.dispose();
});

Deno.test('fromAsync: async () => Result.ok kończy się wartością', async () => {
    const ext = ComputedAsync.fromAsync(async () => Result.ok('ok'));
    const sub = observe(ext);

    expect(sub.current()).toEqual({ status: 'loading' });

    await waitFor(() => sub.current().status === 'value', 'async callback ok');
    expect(sub.current()).toEqual(valueOf('ok'));
    sub.dispose();
});

Deno.test('computeAsync: odczyt Signal odpala request od nowa', async () => {
    const id = Signal.create(1);
    const ext = ComputedAsync.computeAsync(() => {
        const current = id.get();
        return async () => Result.ok(`user-${current}`);
    });
    const sub = observe(ext);

    await waitFor(() => sub.current().status === 'value', 'user-1');
    expect(sub.current()).toEqual(valueOf('user-1'));

    id.set(2);
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 'user-2';
    }, 'user-2');

    expect(sub.current()).toEqual(valueOf('user-2'));
    sub.dispose();
});

Deno.test('computeAsync: zmiana Signal przy tym samym unbox odpala request', async () => {
    const selectedId = Signal.create('all');
    const userBox = Promise.withResolvers<Result<{ id: number }, string>>();
    const user = ComputedAsync.fromAsync(async () => userBox.promise);

    const requests: string[] = [];
    const boxes: Array<PromiseWithResolvers<Result<string, string>>> = [];
    const posts = ComputedAsync.computeAsync((unbox) => {
        const filter = selectedId.get();
        const currentUser = unbox(user);
        return async () => {
            requests.push(`${currentUser.id}:${filter}`);
            const box = Promise.withResolvers<Result<string, string>>();
            boxes.push(box);
            return box.promise;
        };
    });
    const sub = observe(posts);

    userBox.resolve(Result.ok({ id: 7 }));
    await waitFor(() => boxes.length === 1, 'pierwszy request');
    boxes[0]?.resolve(Result.ok('posts-all'));
    await waitFor(() => sub.current().status === 'value', 'posts-all');
    expect(sub.current()).toEqual(valueOf('posts-all'));
    expect(requests).toEqual(['7:all']);

    selectedId.set('open');
    await waitFor(() => boxes.length === 2, 'request po zmianie filtra');
    expect(requests).toEqual(['7:all', '7:open']);

    boxes[1]?.resolve(Result.ok('posts-open'));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 'posts-open' && snapshot.fetching === false;
    }, 'posts-open');
    expect(sub.current()).toEqual(valueOf('posts-open'));
    sub.dispose();
});

Deno.test('fromAsync: instancyjny refresh ponawia request', async () => {
    let calls = 0;
    const ext = ComputedAsync.fromAsync(async () => {
        calls += 1;
        return Result.ok(calls);
    });
    const sub = observe(ext);

    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 1;
    }, 'first value');

    ext.refresh();
    expect(sub.current()).toEqual(valueOf(1, true));

    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 2 && snapshot.fetching === false;
    }, 'refreshed value');

    sub.dispose();
});

Deno.test('fromAsync: refresh(replace) idzie w loading', async () => {
    const ext = ComputedAsync.fromAsync(async () => {
        return Result.ok('ok');
    });
    const sub = observe(ext);

    await waitFor(() => sub.current().status === 'value', 'first value');

    ext.refresh('replace');
    expect(sub.current()).toEqual({ status: 'loading' });

    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.fetching === false;
    }, 'replaced value');
    sub.dispose();
});

Deno.test('computeAsync: zmiana zależności zostawia wartość (fetching), nie loading', async () => {
    const selectedId = Signal.create<number>(1);
    const boxes = new Map<number, {
        promise: Promise<Result<string, string>>;
        resolve: (value: Result<string, string>) => void;
        reject: (error: unknown) => void;
    }>();

    const ext = ComputedAsync.computeAsync(() => {
        const currentId = selectedId.get();
        return async () => {
            const box = Promise.withResolvers<Result<string, string>>();
            boxes.set(currentId, box);
            return box.promise;
        };
    });
    const sub = observe(ext);

    await waitFor(() => boxes.has(1), 'first request');
    boxes.get(1)?.resolve(Result.ok('user-1'));
    await waitFor(() => sub.current().status === 'value', 'user-1');

    selectedId.set(2);
    await waitFor(() => boxes.has(2), 'second request');
    expect(sub.current()).toEqual(valueOf('user-1', true));

    boxes.get(2)?.resolve(Result.ok('user-2'));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 'user-2';
    }, 'user-2');
    sub.dispose();
});

Deno.test('from: keep refresh źródła ustawia fetching na pochodnej', async () => {
    const box = Promise.withResolvers<Result<number, string>>();
    let loads = 0;
    const source = ComputedAsync.fromAsync(async () => {
        loads += 1;
        if (loads === 1) {
            return Result.ok(21);
        }

        return box.promise;
    });
    const doubled = ComputedAsync.from((unbox) => unbox(source) * 2);
    const sub = observe(doubled);

    await waitFor(() => sub.current().status === 'value', 'first doubled');
    expect(sub.current()).toEqual(valueOf(42));

    source.refresh();
    expect(sub.current()).toEqual(valueOf(42, true));

    box.resolve(Result.ok(22));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 44 && snapshot.fetching === false;
    }, 'doubled after keep');
    sub.dispose();
});

Deno.test('fromAsync: Result.error kończy się błędem z refresh', async () => {
    let calls = 0;
    const ext = ComputedAsync.fromAsync(async () => {
        calls += 1;
        if (calls === 1) {
            return Result.error('fail');
        }

        return Result.ok('recovered');
    });
    const sub = observe(ext);

    await waitFor(() => sub.current().status === 'error', 'async error');

    const snapshot = sub.current();
    if (snapshot.status !== 'error') {
        throw new Error('expected error');
    }

    expect(snapshot.error.message).toBe('fail');
    expect(snapshot.jsRuntime).toBe(false);
    snapshot.error.refresh();

    await waitFor(() => sub.current().status === 'value', 'async refresh');
    expect(sub.current()).toEqual(valueOf('recovered'));
    sub.dispose();
});

Deno.test('fromAsync: odrzucony Promise staje się error', async () => {
    const ext = ComputedAsync.fromAsync(async () => {
        throw new Error('network');
    });
    const sub = observe(ext);

    await waitFor(() => sub.current().status === 'error', 'rejected promise');

    const snapshot = sub.current();
    if (snapshot.status !== 'error') {
        throw new Error('expected error');
    }

    expect(snapshot.error.message).toBe('network');
    expect(snapshot.jsRuntime).toBe(true);
    sub.dispose();
});

Deno.test('computeAsync: wyjątek w wyliczeniu staje się error', async () => {
    const ext = ComputedAsync.computeAsync((): (() => Promise<Result<number, string>>) => {
        throw new Error('boom');
    });
    const sub = observe(ext);

    await waitFor(() => sub.current().status === 'error', 'compute throw');

    const snapshot = sub.current();
    if (snapshot.status !== 'error') {
        throw new Error('expected error');
    }

    expect(snapshot.error.message).toBe('boom');
    expect(snapshot.jsRuntime).toBe(true);
    expect(typeof snapshot.error.refresh).toBe('function');
    sub.dispose();
});

Deno.test('computeAsync: stary Promise nie nadpisuje nowszego requestu', async () => {
    const selectedId = Signal.create<number>(1);
    const boxes = new Map<number, {
        promise: Promise<Result<string, string>>;
        resolve: (value: Result<string, string>) => void;
        reject: (error: unknown) => void;
    }>();

    const ext = ComputedAsync.computeAsync(() => {
        const currentId = selectedId.get();
        return async () => {
            const box = Promise.withResolvers<Result<string, string>>();
            boxes.set(currentId, box);
            return box.promise;
        };
    });
    const sub = observe(ext);

    await waitFor(() => boxes.has(1), 'first request');
    selectedId.set(2);
    await waitFor(() => boxes.has(2), 'second request');

    boxes.get(1)?.resolve(Result.ok('stale'));
    await timeout(5);
    expect(sub.current()).toEqual({ status: 'loading' });

    boxes.get(2)?.resolve(Result.ok('fresh'));
    await waitFor(() => sub.current().status === 'value', 'fresh value');
    expect(sub.current()).toEqual(valueOf('fresh'));
    sub.dispose();
});

Deno.test('computeAsync: unbox na loading zależności nie startuje requestu', async () => {
    const innerBox = Promise.withResolvers<Result<number, string>>();
    const inner = ComputedAsync.fromAsync(async () => {
        return innerBox.promise;
    });
    let started = 0;

    const outer = ComputedAsync.computeAsync((unbox) => {
        const value = unbox(inner);
        return async () => {
            started += 1;
            return Result.ok(value + 1);
        };
    });
    const sub = observe(outer);

    await timeout(5);
    expect(sub.current()).toEqual({ status: 'loading' });
    expect(started).toBe(0);

    innerBox.resolve(Result.ok(10));
    await waitFor(() => sub.current().status === 'value', 'outer after inner');
    expect(sub.current()).toEqual(valueOf(11));
    expect(started).toBe(1);
    sub.dispose();
});

Deno.test('computeAsync: refresh przy wartości startuje jeden request', async () => {
    const next = Promise.withResolvers<Result<number, string>>();
    let sourceLoads = 0;
    const source = ComputedAsync.fromAsync(async () => {
        sourceLoads += 1;
        if (sourceLoads === 1) {
            return Result.ok(10);
        }

        return next.promise;
    });

    const childBoxes: Array<PromiseWithResolvers<Result<number, string>>> = [];
    const child = ComputedAsync.computeAsync((unbox) => {
        unbox(source);
        return async () => {
            const box = Promise.withResolvers<Result<number, string>>();
            childBoxes.push(box);
            return box.promise;
        };
    });
    const sub = observe(child);

    await waitFor(() => childBoxes.length === 1, 'pierwszy request');
    childBoxes[0]?.resolve(Result.ok(11));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 11 && snapshot.fetching === false;
    }, 'child value');

    child.refresh();

    expect(sourceLoads).toBe(2);
    expect(childBoxes.length).toBe(2);
    expect(sub.current()).toEqual(valueOf(11, true));

    childBoxes[1]?.resolve(Result.ok(11));
    await timeout(5);
    expect(sub.current()).toEqual(valueOf(11, true));

    next.resolve(Result.ok(10));
    sub.dispose();
});

Deno.test('computeAsync: refresh(keep) źródła startuje request potomka', async () => {
    const sameValue = Promise.withResolvers<Result<number, string>>();
    const nextValue = Promise.withResolvers<Result<number, string>>();
    let sourceLoads = 0;
    const source = ComputedAsync.fromAsync(async () => {
        sourceLoads += 1;
        if (sourceLoads === 1) {
            return Result.ok(10);
        }
        if (sourceLoads === 2) {
            return sameValue.promise;
        }

        return nextValue.promise;
    });

    let started = 0;
    const childBoxes: Array<{
        value: number;
        box: PromiseWithResolvers<Result<number, string>>;
    }> = [];
    const child = ComputedAsync.computeAsync((unbox) => {
        const value = unbox(source);
        return async () => {
            started += 1;
            const box = Promise.withResolvers<Result<number, string>>();
            childBoxes.push({ value, box });
            return box.promise;
        };
    });
    const sub = observe(child);

    await waitFor(() => childBoxes.length === 1, 'pierwszy request potomka');
    childBoxes[0]?.box.resolve(Result.ok(childBoxes[0].value + 1));
    await waitFor(() => sub.current().status === 'value', 'wartość potomka');
    expect(sub.current()).toEqual(valueOf(11));
    expect(started).toBe(1);

    source.refresh();
    await waitFor(() => childBoxes.length === 2, 'request po refresh źródła');
    expect(sub.current()).toEqual(valueOf(11, true));
    expect(started).toBe(2);
    expect(childBoxes[1]?.value).toBe(10);

    sameValue.resolve(Result.ok(10));
    await waitFor(() => childBoxes.length === 3, 'request po zejściu flagi źródła');
    expect(childBoxes[2]?.value).toBe(10);
    childBoxes[2]?.box.resolve(Result.ok(11));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 11 && snapshot.fetching === false;
    }, 'wartość po tym samym źródle');

    source.refresh();
    await waitFor(() => childBoxes.length === 4, 'request po drugim refresh');
    nextValue.resolve(Result.ok(20));
    await waitFor(() => childBoxes.length === 5, 'request po nowej wartości');
    expect(started).toBe(5);
    expect(childBoxes[4]?.value).toBe(20);
    childBoxes[4]?.box.resolve(Result.ok(21));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 21 && snapshot.fetching === false;
    }, 'nowa wartość potomka');
    sub.dispose();
});

Deno.test('computeAsync: fetching potomka zostaje, dopóki źródło jedzie', async () => {
    const sourceBox = Promise.withResolvers<Result<number, string>>();
    let sourceLoads = 0;
    const source = ComputedAsync.fromAsync(async () => {
        sourceLoads += 1;
        if (sourceLoads === 1) {
            return Result.ok(10);
        }

        return sourceBox.promise;
    });

    const childBoxes: Array<PromiseWithResolvers<Result<number, string>>> = [];
    const child = ComputedAsync.computeAsync((unbox) => {
        unbox(source);
        return async () => {
            const box = Promise.withResolvers<Result<number, string>>();
            childBoxes.push(box);
            return box.promise;
        };
    });
    const sub = observe(child);

    await waitFor(() => childBoxes.length === 1, 'pierwszy request potomka');
    childBoxes[0]?.resolve(Result.ok(11));
    await waitFor(() => sub.current().status === 'value', 'wartość potomka');
    expect(sub.current()).toEqual(valueOf(11));

    source.refresh();
    await waitFor(() => childBoxes.length === 2, 'request przy wejściu flagi źródła');
    expect(sub.current()).toEqual(valueOf(11, true));

    childBoxes[1]?.resolve(Result.ok(11));
    await timeout(5);
    expect(sub.current()).toEqual(valueOf(11, true));

    sourceBox.resolve(Result.ok(10));
    await waitFor(() => childBoxes.length === 3, 'request po zejściu flagi źródła');
    expect(sub.current()).toEqual(valueOf(11, true));

    childBoxes[2]?.resolve(Result.ok(11));
    await waitFor(() => {
        const snapshot = sub.current();
        return snapshot.status === 'value' && snapshot.value === 11 && snapshot.fetching === false;
    }, 'spokojna wartość po źródle');
    sub.dispose();
});

Deno.test('fromAsync: odczyt Signal w run nie tworzy subskrypcji', async () => {
    const originalWarn = console.warn;
    console.warn = () => {};

    try {
        const id = Signal.create(1);
        const ext = ComputedAsync.fromAsync(async () => {
            return Result.ok(id.get());
        });
        const sub = observe(ext);

        await waitFor(() => {
            const snapshot = sub.current();
            return snapshot.status === 'value' && snapshot.value === 1;
        }, 'initial untracked value');

        id.set(2);
        await timeout(20);

        expect(sub.current()).toEqual(valueOf(1));
        sub.dispose();
    } finally {
        console.warn = originalWarn;
    }
});

Deno.test('fromAsync: zniknięcie obserwatora nie czyści wartości', async () => {
    const ext = ComputedAsync.fromAsync(async () => {
        return Result.ok('kept');
    });
    const sub = observe(ext);

    await waitFor(() => sub.current().status === 'value', 'kept value');
    sub.dispose();

    const sub2 = observe(ext);
    const snapshot = sub2.current();
    expect(snapshot.status).toBe('value');
    if (snapshot.status === 'value') {
        expect(snapshot.value).toBe('kept');
    }
    sub2.dispose();
});

Deno.test('fromAsync: ponowna obserwacja odświeża keep, nie loading', async () => {
    const boxes: Array<PromiseWithResolvers<Result<string, string>>> = [];
    const ext = ComputedAsync.fromAsync(async () => {
        const box = Promise.withResolvers<Result<string, string>>();
        boxes.push(box);
        return box.promise;
    });

    const sub = observe(ext);
    await waitFor(() => boxes.length === 1, 'first request');
    boxes[0]?.resolve(Result.ok('v1'));
    await waitFor(() => sub.current().status === 'value', 'v1');
    sub.dispose();

    const sub2 = observe(ext);
    expect(sub2.current()).toEqual(valueOf('v1', true));
    expect(sub2.current().status).not.toBe('loading');

    await waitFor(() => boxes.length === 2, 'second request');
    boxes[1]?.resolve(Result.ok('v2'));
    await waitFor(() => {
        const snapshot = sub2.current();
        return snapshot.status === 'value' && snapshot.value === 'v2' && snapshot.fetching === false;
    }, 'v2');
    sub2.dispose();
});

Deno.test('fromAsync: Promise po disconnect jest ignorowany', async () => {
    const first = Promise.withResolvers<Result<string, string>>();
    const second = Promise.withResolvers<Result<string, string>>();
    let calls = 0;
    const ext = ComputedAsync.fromAsync(async () => {
        calls += 1;
        return (calls === 1 ? first : second).promise;
    });

    const sub = observe(ext);
    expect(sub.current()).toEqual({ status: 'loading' });
    sub.dispose();

    first.resolve(Result.ok('late'));
    await timeout(10);

    const sub2 = observe(ext);
    expect(sub2.current()).toEqual({ status: 'loading' });
    expect(calls).toBe(2);

    second.resolve(Result.ok('fresh'));
    await waitFor(() => {
        const snapshot = sub2.current();
        return snapshot.status === 'value' && snapshot.value === 'fresh';
    }, 'fresh after reconnect');
    sub2.dispose();
});

let sideGate: Promise<void> = Promise.resolve();

const withSide = async (
    side: 'browser' | 'server',
    run: () => Promise<void>,
): Promise<void> => {
    const previous = sideGate;
    let release!: () => void;
    sideGate = new Promise<void>((resolve) => {
        release = resolve;
    });
    await previous;

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    if (side === 'browser') {
        Object.defineProperty(globalThis, 'window', {
            value: {},
            configurable: true,
            writable: true,
        });
    } else {
        Reflect.deleteProperty(globalThis, 'window');
    }

    try {
        await run();
    } finally {
        if (descriptor === undefined) {
            Reflect.deleteProperty(globalThis, 'window');
        } else {
            Object.defineProperty(globalThis, 'window', descriptor);
        }
        release();
    }
};

Deno.test('browser.fromAsync: na serwerze zostaje w loading i nie woła callbacka', async () => {
    await withSide('server', async () => {
        let calls = 0;
        const id = Signal.create(1);
        const ext = ComputedAsync.browser.computeAsync(() => {
            calls += 1;
            id.get();
            return async () => {
                calls += 1;
                return Result.ok(calls);
            };
        });
        const sub = observe(ext);

        await timeout(20);
        ext.refresh();
        ext.refresh('replace');
        id.set(2);
        await timeout(20);

        expect(sub.current()).toEqual({ status: 'loading' });
        expect(calls).toBe(0);
        sub.dispose();
    });
});

Deno.test('browser.fromAsync: w przeglądarce ładuje jak fromAsync', async () => {
    await withSide('browser', async () => {
        const ext = ComputedAsync.browser.fromAsync(async () => {
            return Result.ok(7);
        });
        const sub = observe(ext);

        await waitFor(() => sub.current().status === 'value', 'browser value');

        expect(sub.current()).toEqual(valueOf(7));
        sub.dispose();
    });
});

Deno.test('server.fromAsync: w przeglądarce zostaje w loading i nie woła callbacka', async () => {
    await withSide('browser', async () => {
        let calls = 0;
        const ext = ComputedAsync.server.fromAsync(async () => {
            calls += 1;
            return Result.ok(1);
        });
        const sub = observe(ext);

        await timeout(20);
        ext.refresh();
        await timeout(20);

        expect(sub.current()).toEqual({ status: 'loading' });
        expect(calls).toBe(0);
        sub.dispose();
    });
});

Deno.test('server.fromAsync: na serwerze ładuje jak fromAsync', async () => {
    await withSide('server', async () => {
        const ext = ComputedAsync.server.fromAsync(async () => {
            return Result.ok('srv');
        });
        const sub = observe(ext);

        await waitFor(() => sub.current().status === 'value', 'server value');

        expect(sub.current()).toEqual(valueOf('srv'));
        sub.dispose();
    });
});

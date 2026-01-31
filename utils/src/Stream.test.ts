import { Stream } from "./Stream.ts";
import { expect } from "jsr:@std/expect";
import { timeout } from "./timeout.ts";

const collectFromStream = <T>(stream: AsyncIterable<T>, result: T[]) => {
    (async () => {
        try {
            for await (const chunk of stream) {
                result.push(chunk);
            }
        } catch (_e) {
            // ignore
        }
    })();
};

Deno.test('Stream - basic push and read', async () => {
    const list: number[] = [];
    const streamWrapper = new Stream<number>();

    // Test direct iteration on the class instance
    (async () => {
        try {
            for await (const chunk of streamWrapper.readable) {
                list.push(chunk);
            }
        } catch (_e) {
            // ignore
        }
    })();

    streamWrapper.push(1);
    streamWrapper.push(2);

    await timeout(0);
    expect(list).toEqual([1, 2]);

    streamWrapper.push(3);
    await timeout(0);
    expect(list).toEqual([1, 2, 3]);

    streamWrapper.close();
});

Deno.test('Stream - close behavior', async () => {
    const list: string[] = [];
    const streamWrapper = new Stream<string>();
    let closed = false;

    streamWrapper.onAbort(() => {
        closed = true;
    });

    collectFromStream(streamWrapper.readable, list);

    streamWrapper.push('a');
    await timeout(0);
    expect(list).toEqual(['a']);
    expect(closed).toBe(false);

    streamWrapper.close();
    expect(closed).toBe(true);

    // Closing again should be safe
    streamWrapper.close();

    await timeout(0);
    expect(closed).toBe(true);
    
    // Pushing after close should be safe and ignored (with warning)
    streamWrapper.push('b');
    // List should remain unchanged
    expect(list).toEqual(['a']);
});


Deno.test('Stream - backpressure (desiredSize)', async () => {
    // Set explicit highWaterMark to 2
    const streamWrapper = new Stream<string>(2);
    
    // Initial: buffer empty.
    expect(streamWrapper.desiredSize).toBe(2);
    
    streamWrapper.push('fill1');
    // Buffer has 1 item. desiredSize should be 2 - 1 = 1
    expect(streamWrapper.desiredSize).toBe(1);
    
    streamWrapper.push('fill2');
    // Buffer has 2 items. Full. desiredSize should be 0.
    expect(streamWrapper.desiredSize).toBe(0);

    streamWrapper.push('fill3');
    // Buffer has 3 items. Overfilled. desiredSize should be -1.
    expect(streamWrapper.desiredSize).toBe(-1);
});

Deno.test('Stream - onAbort triggered on cancel (loop break)', async () => {
    const streamWrapper = new Stream<number>();
    let closed = false;

    streamWrapper.onAbort(() => {
        closed = true;
    });

    (async () => {
        for await (const _ of streamWrapper.readable) {
            break; // This triggers return() which calls cancel()
        }
    })();

    streamWrapper.push(1); // Push one item so loop starts and breaks

    await timeout(0);
    expect(closed).toBe(true);
});

Deno.test('Stream - onAbort immediate execution on closed stream', async () => {
    const streamWrapper = new Stream<number>();
    let callCount = 0;

    streamWrapper.close();

    streamWrapper.onAbort(() => {
        callCount++;
    });

    expect(callCount).toBe(1);
});

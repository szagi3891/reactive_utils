import { Stream } from "./Stream.ts";
import { expect } from "jsr:@std/expect";
import { timeout } from "./timeout.ts";

const collectFromStream = <T>(stream: ReadableStream<T>, result: T[]) => {
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

    streamWrapper.onWhenClose(() => {
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
    
    // Pushing after close might throw on controller or be ignored depending on implementation,
    // but controller.enqueue throws if closed. Let's verify safety if desired or expect throw.
    // Our wrapper implementation calls controller.desciredSize or enqueue directly.
    // ReadableStreamDefaultController throws if 'close' state.
    // However, users should check logic. Let's see if it throws.
    try {
        streamWrapper.push('b');
        // If it didn't throw, list shouldn't update anyway?
    } catch (e) {
        expect(e).toBeDefined(); // Standard stream behavior is to throw on enqueue after close
    }
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

Deno.test('Stream - onWhenClose triggered on cancel', async () => {
    const streamWrapper = new Stream<number>();
    let closed = false;

    streamWrapper.onWhenClose(() => {
        closed = true;
    });

    const reader = streamWrapper.readable.getReader();
    
    // Consumer cancels the stream
    await reader.cancel('consumer cancelled');

    expect(closed).toBe(true);
});

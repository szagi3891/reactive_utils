import { expect } from "jsr:@std/expect";
import { AsyncWebSocket } from "./AsyncWebsocket.ts";
import { timeout } from "../timeout.ts";

/**
 * Mock WebSocket implementation for testing
 */
class MockWebSocket {
    static instances: MockWebSocket[] = [];
    public onopen: (() => void) | null = null;
    public onclose: (() => void) | null = null;
    public onmessage: ((event: { data: string }) => void) | null = null;
    public onerror: ((error: unknown) => void) | null = null;
    public readyState: number = 0; // 0: CONNECTING, 1: OPEN, 3: CLOSED

    public listeners: Record<string, Function[]> = {
        open: [],
        close: [],
        message: [],
        error: []
    };

    public sentMessages: string[] = [];
    public closed: boolean = false;

    constructor(public url: string) {
        MockWebSocket.instances.push(this);
        queueMicrotask(() => {
            if (this.closed) return;
            this.readyState = 1;
            this.trigger('open');
            if (this.onopen) this.onopen();
        });
    }

    addEventListener(event: string, callback: Function) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    removeEventListener(event: string, callback: Function) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    trigger(event: string, data?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    send(data: string) {
        if (this.closed) throw new Error('WebSocket is closed');
        this.sentMessages.push(data);
    }

    close() {
        this.closed = true;
        this.readyState = 3;
        this.trigger('close');
        if (this.onclose) this.onclose();
    }

    // Helper to simulate incoming message
    simulateMessage(data: string) {
        this.trigger('message', { data });
        if (this.onmessage) this.onmessage({ data });
    }
}

// Override global WebSocket for testing
// @ts-ignore: Deno global
globalThis.WebSocket = MockWebSocket;

Deno.test('AsyncWebSocket - create and connect', async () => {
    MockWebSocket.instances = [];
    
    // Create socket
    const socket = await AsyncWebSocket.create('ws://test.local', null, 1000, true);
    
    expect(socket).not.toBeNull();
    expect(MockWebSocket.instances.length).toBe(1);
    
    if (socket) {
        socket.close();
    }
});

Deno.test('AsyncWebSocket - send and receive messages', async () => {
    MockWebSocket.instances = [];
    const socket = await AsyncWebSocket.create('ws://test.local', null, 1000, false);
    
    if (!socket) throw new Error('Socket creation failed');
    
    const messages: string[] = [];
    
    (async () => {
        for await (const msg of socket.subscribe()) {
            messages.push(msg);
        }
    })();

    // Test send
    socket.send('hello');
    const mockWs = MockWebSocket.instances[0];

    if (mockWs === undefined) {
        throw Error('Expected socket instance');
    }

    expect(mockWs.sentMessages).toContain('hello');

    // Test receive
    mockWs.simulateMessage('world');
    await timeout(0);
    expect(messages).toEqual(['world']);

    socket.close();
});

Deno.test('AsyncWebSocket - close behavior', async () => {
    MockWebSocket.instances = [];
    const socket = await AsyncWebSocket.create('ws://test.local', null, 1000, false);
    
    if (!socket) throw new Error('Socket creation failed');
    
    const mockWs = MockWebSocket.instances[0];
    if (mockWs === undefined) {
        throw Error('Expected socket instance');
    }

    expect(mockWs.closed).toBe(false);

    socket.close();
    expect(mockWs.closed).toBe(true);
});

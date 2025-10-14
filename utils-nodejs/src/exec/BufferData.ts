import { Buffer } from "node:buffer";


function isUint8Array(val: unknown): val is Uint8Array {
    return val instanceof Uint8Array;
}

export class BufferData {
    private readonly chunks: Uint8Array[] = [];

    public onChange = (chunk: unknown) => {
        if (isUint8Array(chunk)) {
            this.chunks.push(chunk);
        } else {
            throw Error('Expected Uint8Array<ArrayBufferLike>');
        }
    }

    public toString(): string {
        return Buffer.concat(this.chunks).toString("utf8");
    }
}


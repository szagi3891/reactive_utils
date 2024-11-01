

export class ResizableUint8Array {
    private buffer: Uint8Array;
    private lengthValue: number;

    constructor(initialSize: number = 16) {
        this.buffer = new Uint8Array(initialSize);
        this.lengthValue = 0;
    }

    // Dodaje pojedynczy bajt
    push(byte: number): void {
        if (0 <= byte && byte <= 255) {
            //ok
        } else {
            throw Error(`Nieprawidłowy zakres ${byte}`);
        }

        if (this.lengthValue >= this.buffer.length) {
            this.expand();
        }
        this.buffer[this.lengthValue] = byte;
        this.lengthValue++;
    }

    // Dodaje wiele bajtów na raz
    pushBytes(bytes: Uint8Array): void {
        while (this.lengthValue + bytes.length > this.buffer.length) {
            this.expand();
        }

        this.buffer.set(bytes, this.lengthValue);
        this.lengthValue += bytes.length;
    }

    // Zwraca zawartość jako Uint8Array o odpowiedniej długości
    toUint8Array(): Uint8Array {
        return this.buffer.slice(0, this.lengthValue);
    }

    // Prywatna metoda do rozszerzenia bufora (dwukrotność aktualnego rozmiaru)
    private expand(): void {
        const newBuffer = new Uint8Array(this.buffer.length * 2);
        newBuffer.set(this.buffer);
        this.buffer = newBuffer;
    }

    public get length(): number {
        return this.lengthValue;
    }
}

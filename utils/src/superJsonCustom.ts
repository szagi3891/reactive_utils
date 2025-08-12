import superJsonCustom from 'superjson';

const arrayBufferToString = (buffer: ArrayBuffer): string => {
    const uint8Array = new Uint8Array(buffer);
    const hexString = [];
    for (const char of uint8Array) {
        const hex = char.toString(16).padStart(2, '0');
        hexString.push(hex);
    }

    return hexString.join('');
};

const stringToArrayBuffer = (data: string): ArrayBuffer => {
    const length = data.length / 2;
    const uint8Array = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const byte = parseInt(data.substr(i * 2, 2), 16);
        uint8Array[i] = byte;
    }
    return uint8Array.buffer;
};

// // Funkcja konwertująca ArrayBuffer do base64
// const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
//     const bytes = new Uint8Array(buffer);
//     let binary = '';
//     for (const byte of bytes) {
//         binary += String.fromCharCode(byte);
//     }
//     return btoa(binary);
// };

// // Funkcja konwertująca base64 na ArrayBuffer
// const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
//     const binary = atob(base64);
//     const buffer = new ArrayBuffer(binary.length);
//     const bytes = new Uint8Array(buffer);
//     for (let i = 0; i < binary.length; i++) {
//         bytes[i] = binary.charCodeAt(i);
//     }
//     return buffer;
// };

// Rejestracja niestandardowego typu ArrayBuffer
superJsonCustom.registerCustom<ArrayBuffer, string>(
    {
        isApplicable: (v): v is ArrayBuffer => v instanceof ArrayBuffer,
        serialize: (v) => arrayBufferToString(v),
        deserialize: (v) => stringToArrayBuffer(v),
    },
    'ArrayBuffer'
);

export {
    superJsonCustom
};

import { EventEmitter } from "../EventEmitter.ts";
import { whenDrop } from "./whenDrop.ts";

//----------------------------------------------------------------

const addressRegistry = new WeakMap<WeakKey, symbol>();
const whenFree = new EventEmitter<symbol>();

const getAddress = <T extends WeakKey>(key: T): symbol => {
    const address = addressRegistry.get(key);

    if (address !== undefined) {
        return address;
    }

    console.error(key);
    throw new Error('Address not found');
};

const register = <T extends WeakKey>(key: T) => {
    if (addressRegistry.has(key)) {
        console.error(key);
        throw new Error('Address already registered');
    }

    const newAddress = Symbol();
    addressRegistry.set(key, newAddress);
};

const free = <T extends WeakKey>(key: T) => {
    const address = getAddress(key);
    whenFree.trigger(address);
    
    if (addressRegistry.delete(key)) {
        //usunięto
    } else {
        console.error(key);
        throw new Error('Address not found');
    }
};

//----------------------------------------------------------------

class WeakMapWrapper<T extends WeakKey> {

    constructor(public readonly inst: T) {
        register(inst);
        whenDrop(this, this.whenDrop);
    }

    private whenDrop = () => {
        free(this.inst);
    }
}

//----------------------------------------------------------------

export const cacheFnWeakMap = <K extends WeakKey, R>(fn: (key: K) => R): ((target: K) => R) => {
    const cache = new CacheFnWeakMap<K, R>(fn);
    return cache.get;
};

cacheFnWeakMap.Wrapper = WeakMapWrapper;

class CacheFnWeakMap<K extends WeakKey, R> {
    private readonly cache = new WeakMap<symbol, R>();

    constructor(private readonly fn: (key: K) => R) {
        const unregister = whenFree.on(this.whenDeleteSymbol);
        whenDrop(this, unregister);
    }

    private whenDeleteSymbol = (address: symbol) => {
        this.cache.delete(address);
    };

    public get = (key: K): R => {
        const address = getAddress(key);

        const value = this.cache.get(address);

        if (value !== undefined) {
            return value;
        }

        const newValue = this.fn(key);
        this.cache.set(address, newValue);
        return newValue;
    }
}


//TODO - gdyby dało się określić ze obiekt moze być konstruowany tylko przez wrapper

// class Session {

//     public static create(): WeakMapWrapper<Session> {
//         return new cacheFnWeakMap.Wrapper(new Session());
//     }

//     private constructor() {
//     }
// }




// TODO - dodać event emmiter

// export const cacheFnWeakMap = <K extends WeakKey, R>(fn: (key: K) => R): ((target: K) => R) => {
//     const cache = new WeakMap<symbol, R>();

//     const result = (target: K): R => {
//         const address = getAddress(target);

//         const value = cache.get(address);

//         if (value !== undefined) {
//             return value;
//         }

//         const newValue = fn(target);
//         cache.set(address, newValue);

//         return newValue;
//     };

//     //TODO - wpięcie na event emmiteer

//     whenDrop(result, () => {

//         //TODO - odłączenie od event emmitera
//     });
    
//     return result;
// };

//TODO - trzeba będzie obiekt względem którego adresujemy w ten obiekt
//jak ten obiekt zostanie zniszczony, to wtedy powinien się wywołać destruktor



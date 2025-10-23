function runCallback(callback: () => void) {
    callback();
};

const registryDrop: FinalizationRegistry<() => void> = new FinalizationRegistry(runCallback);

export function whenDrop(target: WeakKey, whenDrop: () => void) {
    registryDrop.register(target, whenDrop)
};

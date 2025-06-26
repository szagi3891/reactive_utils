export const addEventOffline = (callback: () => void): (() => void)=> {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const callbacklistener = () => callback();

    window.addEventListener('offline', callbacklistener);

    return () => {
        window.removeEventListener('offline', callbacklistener);
    };
};

export const addEventOnline = (callback: () => void): (() => void)=> {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const callbacklistener = () => callback();

    window.addEventListener('online', callbacklistener);

    return () => {
        window.removeEventListener('online', callbacklistener);
    };
};

export const timeout = (timeoutMs: number): Promise<void> => {

    return new Promise((resolve) => {

        const unsubscribe = addEventOnline(resolve);
    
        setTimeout(() => {
            unsubscribe();
            resolve();
        }, timeoutMs);
    });
};

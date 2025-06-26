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

const whenVisible = (callback: () => void): (() => void) => {
    if (typeof window === 'undefined') {
        return () => {};
    }

    const callbacklistener = () => {
        if (document.visibilityState === 'visible') {
            callback();
        }
    };

    document.addEventListener('visibilitychange', callbacklistener);
    return () => {
        document.removeEventListener('visibilitychange', callbacklistener);
    };
}

export const timeout = (timeoutMs: number): Promise<void> => {

    return new Promise((resolve) => {

        const unsubscribeOnline = addEventOnline(resolve);
        const unsubscribeWhenVisible = whenVisible(resolve);
    
        setTimeout(() => {
            unsubscribeOnline();
            unsubscribeWhenVisible();
            resolve();
        }, timeoutMs);
    });
};

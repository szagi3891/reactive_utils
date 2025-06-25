

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

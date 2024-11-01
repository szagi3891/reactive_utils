import { timeout } from "../timeout.ts";

interface DenoInterface {
    addSignalListener: (name: 'SIGINT', callback: () => void) => void;
    exit: () => void;
}

export const installGlobalSigint = (deno: DenoInterface, expectMaxSeconds: number): void => {

    let isKill: boolean = false;

    deno.addSignalListener("SIGINT", async () => {
        console.log("\n\ninterrupted!\n");

        if (isKill === true) {
            return;
        }

        isKill = true;
            
        const max = expectMaxSeconds;

        for (let i=0; i<max; i++) {
            console.info(`wait ${max - i}s`);
            await timeout(1000);
        }
        
        deno.exit();
    });
}


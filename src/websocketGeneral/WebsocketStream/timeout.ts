import { timeout } from '@reactive/utils';
import type { OnlineSemafor } from './onlineSemafor.ts';

export const timeoutSemafor = async (semafor: OnlineSemafor, timeoutMs: number): Promise<void> => {
    const targetTime = new Date();
    targetTime.setTime(targetTime.getTime() + timeoutMs);

    while (true) {
        const now = new Date();
        if (now > targetTime) {
            return;
        }

        if (semafor.online === false) {
            return;
        }

        await timeout(200);
    }
};


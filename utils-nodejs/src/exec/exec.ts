import process from "node:process";
import { spawnPromise, spawnPromiseAndGet } from './spawnPromise.ts';

export async function exec(cwd: string, commandStr: string, env = {}) {
    const [command, ...args] = commandStr.split(' ');

    if (command === undefined) {
        throw Error('Błędny parametr wejściowy command');
    }

    const code = await spawnPromise(command, args, {
        cwd,
        env: {
            ...process.env,
            ...env,
        },
        shell: true,
    });

    if (code !== 0) {
        throw Error(`Expected codee=0, receive code=${code}`);
    }
}

export async function execSsh(cwd: string, sshCommand: string, remoteCommand: string, env = {}) {
    const code = await spawnPromise('ssh', [sshCommand, `cd ${cwd} && ${remoteCommand}`], {
        env: {
            ...process.env,
            ...env,
        },
        // Kluczowe: shell: false, aby uniknąć problemów z escapowaniem
        shell: true,           //TODO - do sprawdzenia 
    });

    if (code !== 0) {
        throw Error(`Expected codee=0, receive code=${code}`);
    }
}

export async function sshExecAndGet(
    cwd: string,
    commandStr: string,
    env: Record<string, string> = {}
): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const [command, ...args] = commandStr.split(' ');

    if (command === undefined) {
        throw Error('Błędny parametr wejściowy command');
    }

    const result = await spawnPromiseAndGet(command, args, {
        cwd,
        env: {
            ...process.env,
            ...env,
        },
        shell: true,
    });

    return result;
}

export async function sshExec(cwd: string, sshCommand: string, remoteCommand: string, env = {}): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const result = await spawnPromiseAndGet('ssh', [sshCommand, `cd ${cwd} && ${remoteCommand}`], {
        env: {
            ...process.env,
            ...env,
        },
        // Kluczowe: shell: false, aby uniknąć problemów z escapowaniem
        shell: true,           //TODO - do sprawdzenia 
    });

    return result;
}
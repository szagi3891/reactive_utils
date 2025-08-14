import process from "node:process";
import { spawnPromise, spawnPromiseAndGet } from './spawnPromise.ts';

export async function exec(cwd: string, commandStr: string, env = {}) {
    const [command, ...args] = commandStr.split(' ');

    if (command === undefined) {
        throw Error('Błędny parametr wejściowy command');
    }

    await spawnPromise(command, args, {
        cwd,
        env: {
            ...process.env,
            ...env,
        },
        shell: true,
    });
}

export async function execSsh(cwd: string, sshCommand: string, remoteCommand: string, env = {}) {
    await spawnPromise('ssh', [sshCommand, `cd ${cwd} && ${remoteCommand}`], {
        env: {
            ...process.env,
            ...env,
        },
        // Kluczowe: shell: false, aby uniknąć problemów z escapowaniem
        shell: false,           //TODO - do sprawdzenia 
    });
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

export async function sshExec(cwd: string, sshCommand: string, remoteCommand: string, env = {}) {
    const result = await spawnPromiseAndGet('ssh', [sshCommand, `cd ${cwd} && ${remoteCommand}`], {
        env: {
            ...process.env,
            ...env,
        },
        // Kluczowe: shell: false, aby uniknąć problemów z escapowaniem
        shell: false,           //TODO - do sprawdzenia 
    });

    return result;
}
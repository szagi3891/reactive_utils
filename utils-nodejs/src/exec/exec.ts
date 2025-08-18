import process from "node:process";
import { spawnPromise, spawnPromiseAndGet } from './spawnPromise.ts';
import { EscapeString } from "./shellEscape.ts";

const splitCommandStr = (commandStr: string): [string, Array<string>] => {
    const [command, ...args] = commandStr.split(' ');

    if (command === undefined) {
        throw Error('Błędny parametr wejściowy command');
    }

    return [command, args];
};

const normalizeArg = (value: string | EscapeString): EscapeString => {
    if (typeof value === 'string') {
        return EscapeString.fromConst(value);
    }

    return value;
};

export async function exec(params: {
    cwd: string,
    commandStr: string,
    argsIn: Array<string | EscapeString>,
    env: Record<string, string>
}) {
    const {cwd, commandStr, argsIn, env} = params;
    const [command, args] = splitCommandStr(commandStr);

    const code = await spawnPromise(command, [...args, ...argsIn].map(normalizeArg), {
        cwd,
        env: {
            ...process.env,
            ...env,
        },
        // shell: true,
    }, false);

    if (code !== 0) {
        throw Error(`Expected codee=0, receive code=${code}`);
    }
}

export async function execSsh(params: {
    cwd: string,
    sshCommand: string,
    remoteCommand: string,
    argsIn: Array<string | EscapeString>,
    env: Record<string, string>
}) {
    const {cwd, sshCommand, remoteCommand, argsIn, env} = params;

    const code = await spawnPromise('ssh', [sshCommand, 'cd', cwd, '&&', remoteCommand, ...argsIn].map(normalizeArg), {
        env: {
            ...process.env,
            ...env,
        },
        // shell: false,           //jeślli jest true, to na ssh serwerze nie działa zaciąganie obazu dokerowego
    }, true);

    if (code !== 0) {
        throw Error(`Expected codee=0, receive code=${code}`);
    }
}

export async function execAndGet(
    params: {
        cwd: string,
        commandStr: string,
        argsIn: Array<string | EscapeString>,
        env: Record<string, string>
    }
): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const { cwd, commandStr, argsIn, env } = params;
    const [command, args] = splitCommandStr(commandStr);

    const result = await spawnPromiseAndGet(command, [...args, ...argsIn].map(normalizeArg), {
        cwd,
        env: {
            ...process.env,
            ...env,
        },
    }, false);

    return result;
}

export async function execSshAndGet(params: {
    cwd: string,
    sshCommand: string,
    remoteCommand: string,
    argsIn: Array<string | EscapeString>,
    env: Record<string, string>
}): Promise<{
    code: number;
    stdout: string;
    stderr: string;
}> {
    const {cwd, sshCommand, remoteCommand, argsIn, env} = params;

    const result = await spawnPromiseAndGet('ssh', [sshCommand, 'cd', cwd, '&&', remoteCommand, ...argsIn].map(normalizeArg), {
        env: {
            ...process.env,
            ...env,
        },
        // shell: false,           //jeślli jest true, to na ssh serwerze nie działa zaciąganie obazu dokerowego
    }, true);

    return result;
}

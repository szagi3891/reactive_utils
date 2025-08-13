import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import { spawn } from 'node:child_process';
import process from "node:process";
import chalk from 'chalk';

const getEnv = (env: NodeJS.ProcessEnv | undefined): Record<string, string> | undefined => {
    const result: Record<string, string> = {};

    if (env === undefined) {
        return undefined;
    }

    for (const [key, value] of Object.entries(env)) {
        if (value === undefined) {
            continue;
        }

        if (process.env[key] === value) {
            continue;
        } else {
            result[key] = value;
        }
    }
    
    if (Object.keys(result).length === 0) {
        return undefined;
    }

    return result;
};

const spawnPromise = (command: string, args: Array<string>, options: SpawnOptionsWithoutStdio): Promise<void> => {
    options.env

    console.info(chalk.green(JSON.stringify({
        command,
        args,
        options: {
            ...options,
            env: getEnv(options.env),
        },
    }, null, 4)));

    return new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
            ...options,
            stdio: 'inherit',
        });

        // Funkcja do zabijania procesu podrzędnego
        const onSigint = () => {
            console.log("Caught SIGINT. Killing child process.");
            child.kill();
        };

        // Rejestracja listenera dla sygnału SIGINT
        process.on('SIGINT', onSigint);

        child.on('close', (code) => {
            // Usunięcie listenera, gdy proces podrzędny się zakończy
            process.removeListener('SIGINT', onSigint);
            
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });

        child.on('error', (err) => {
            // Usunięcie listenera w przypadku błędu
            process.removeListener('SIGINT', onSigint);
            reject(err);
        });
    });
};

export async function exec(cwd: string, commandStr: string, env = {}) {
    const [command, ...args] = commandStr.split(' ');

    if (command === undefined) {
        throw Error('Błędny parametr wejściowy command');
    }

    try {
        await spawnPromise(commandStr, args, {
            cwd,
            env: {
                ...process.env,
                ...env,
            },
            shell: true,
        });
    } catch (error) {
        console.error(`CWD: ${cwd}`);
        console.error(`COMMAND: ${commandStr}`);
        throw error;
    }
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


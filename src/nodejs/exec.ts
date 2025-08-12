import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import { spawn } from 'node:child_process';
import process from "node:process";

const spawnPromise = (commandStr: string, options: SpawnOptionsWithoutStdio): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        const [command, ...args] = commandStr.split(' ');

        if (command === undefined) {
            throw Error('Błędny parametr wejściowy command');
        }

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
    console.info(`exec ${cwd} ${commandStr}`);

    try {
        await spawnPromise(commandStr, {
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
import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import { spawn } from 'node:child_process';
import process from "node:process";
import chalk from 'chalk';

const spawnPromise = (command: string, args: Array<string>, options: SpawnOptionsWithoutStdio): Promise<void> => {
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
    console.info(chalk.green(`exec ${cwd} ${commandStr}`));

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
    console.info(chalk.green(`Executing SSH command: ${cwd} ${sshCommand} "${remoteCommand}"`));

    try {
        await spawnPromise('ssh', [sshCommand, remoteCommand], {
            cwd,
            env: {
                ...process.env,
                ...env,
            },
            // Kluczowe: shell: false, aby uniknąć problemów z escapowaniem
            shell: false,           //TODO - do sprawdzenia 
        });
    } catch (error) {
        console.error(`CWD: ${cwd}`);
        console.error(`SSH COMMAND: ${sshCommand}`);
        console.error(`REMOTE COMMAND: ${remoteCommand}`);
        throw error;
    }
}


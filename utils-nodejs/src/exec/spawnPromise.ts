import type { SpawnOptionsWithoutStdio } from 'node:child_process';
import { spawn } from 'node:child_process';
import process from "node:process";
import chalk from 'chalk';
import { Buffer } from "node:buffer";

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

export const spawnPromise = (command: string, args: Array<string>, options: SpawnOptionsWithoutStdio): Promise<number> => {
    console.info(chalk.green(JSON.stringify({
        command,
        args,
        options: {
            ...options,
            env: getEnv(options.env),
        },
    }, null, 4)));

    return new Promise((resolve, reject) => {
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
            
            if (code === null) {
                throw Error('Code: expected nuumber');
            }

            resolve(code);
        });

        child.on('error', (err) => {
            // Usunięcie listenera w przypadku błędu
            process.removeListener('SIGINT', onSigint);
            reject(err);
        });
    });
};

function isUint8Array(val: unknown): val is Uint8Array {
    return val instanceof Uint8Array;
}

export const spawnPromiseAndGet = (
    command: string,
    args: Array<string>,
    options: SpawnOptionsWithoutStdio
): Promise<{ code: number, stdout: string; stderr: string }> => {
    console.info(chalk.green(JSON.stringify({
        command,
        args,
        options: {
            ...options,
            env: getEnv(options.env),
        },
    }, null, 4)));

    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            ...options,
            stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
        });

        const stdoutChunks: Uint8Array[] = [];
        const stderrChunks: Uint8Array[] = [];

        child.stdout?.on("data", (chunk) => {
            if (isUint8Array(chunk)) {
                stdoutChunks.push(chunk);
            } else {
                throw Error('Expected Uint8Array<ArrayBufferLike>');
            }
        });

        child.stderr?.on("data", (chunk) => {
            if (isUint8Array(chunk)) {
                stderrChunks.push(chunk);
            } else {
                throw Error('Expected Uint8Array<ArrayBufferLike>');
            }
        });

        const onSigint = () => {
            console.log("Caught SIGINT. Killing child process.");
            child.kill();
        };

        process.on("SIGINT", onSigint);

        child.on("close", (code) => {
            process.removeListener("SIGINT", onSigint);
            const stdout = Buffer.concat(stdoutChunks).toString("utf8");
            const stderr = Buffer.concat(stderrChunks).toString("utf8");

            if (code === null) {
                throw Error('Code: expected nuumber');
            }

            resolve({ code, stdout, stderr });
        });

        child.on("error", (err) => {
            process.removeListener("SIGINT", onSigint);
            reject(err);
        });
    });
};
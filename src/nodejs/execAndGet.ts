import { exec as childExec } from 'node:child_process';
import { promisify } from 'node:util';
import chalk from 'chalk';
import process from "node:process";

const execPromise = promisify(childExec);

export async function execAndGet(
    cwd: string,
    commandStr: string,
    env: Record<string, string> = {}
): Promise<string> {
    console.info(chalk.green(`exec ${cwd} ${commandStr}`));

    const { stdout, stderr } = await execPromise(commandStr, {
        cwd,
        env: {
            ...process.env,
            ...env,
        },
    });

    if (stderr.length > 0) {
        console.log(chalk.red(stderr));
    }

    return stdout;
}
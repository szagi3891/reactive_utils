import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { showLog } from './exec/getEnv.ts';
import { convertArgs, type SpawnArgsType } from './exec/SpawnArgsType.ts';
import { waitForExit } from './exec/waitForExit.ts';
import { BufferData } from './exec/BufferData.ts';
import process from "node:process";

type ShellDirType = {
    sshLogin: string | null,
    cwd: string,
}

export class ShellDir {

    private constructor(private readonly params: ShellDirType) {}

    static fromLocal(cwd: string): ShellDir {
        return new ShellDir({
            sshLogin: null,
            cwd,
        });
    }

    static fromSsh(cwd: string, sshLogin: string): ShellDir {
        return new ShellDir({
            sshLogin,
            cwd,
        });
    }

    public cd(dir: string): ShellDir {
        return new ShellDir({
            sshLogin: this.params.sshLogin,
            cwd: [this.params.cwd, dir].join('/'),
        });
    }

    private getArgs = (command: string, args?: Array<string>,): [string, Array<string>] => {
        const chunks = command
            .split(' ')
            .map(item => item.trim())
            .filter(item => item !== '');

        const all = [...chunks, ...(args ?? [])];

        const [ commandFirst, ...rest ] = all;

        if (commandFirst === undefined) {
            throw Error(`Command musi coś zawierać = "${command}"`);
        }

        return [ commandFirst, rest ];
    };

    private readonly getSpawnArgs = (params: {
        command: string,
        args?: Array<string>,
        env?: Record<string, string>
    }): SpawnArgsType => {
        const {command, args = [], env = {}} = params;

        const [ commandFirst, argsRest ] = this.getArgs(command, args);

        const spawnArgs: SpawnArgsType = {
            command: commandFirst,
            args: argsRest,
            sshLogin: this.params.sshLogin,
            cwd: this.params.cwd,
            env: {
                ...(this.params.sshLogin === null ? process.env : {}),  //na serwer ssh nie przekazuj parametrów
                ...env,
            },
        };

        return spawnArgs;
    }

    async exec(params: {
        command: string,
        args?: Array<string>,
        env?: Record<string, string>
    }): Promise<void> {
        const spawnArgs = this.getSpawnArgs(params);

        showLog(spawnArgs);
        const { command, args, cwd, env, input } = convertArgs(spawnArgs);
    
        const child = spawn(command, args, {
            cwd,
            env,
            stdio: ['pipe', "inherit", "inherit"],
        });
    
        if (input !== undefined) {
            console.info('');
            console.info(chalk.green(input));
            console.info('');

            child.stdin.write(`${input}\n`);
            child.stdin.end();
        }

        const code = await waitForExit(child);
    
        if (code !== 0) {
            throw Error(`Expected codee=0, receive code=${code}`);
        }
        return;
    }

    async execAndGet(params: { command: string, args?: Array<string>, env?: Record<string, string>}): Promise<string> {
        const spawnArgs = this.getSpawnArgs(params);

        showLog(spawnArgs);
        const { command, args, cwd, env, input } = convertArgs(spawnArgs);

        const child = spawn(command, args, {
            cwd,
            env,
            stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
        });

        const stdoutChunks = new BufferData();
        const stderrChunks = new BufferData();

        child.stdout.on("data", stdoutChunks.onChange);
        child.stderr.on("data", stderrChunks.onChange);

        if (input !== undefined) {
            console.info('');
            console.info(chalk.green(input));
            console.info('');

            child.stdin.write(`${input}\n`);
            child.stdin.end();
        }

        const code = await waitForExit(child);

        const stdout = stdoutChunks.toString();
        const stderr = stderrChunks.toString();

        if (code !== 0) {
            console.info(chalk.red(stderr));
            console.info(chalk.red(stdout));

            throw Error(`Expected codee=0, receive code=${code}`);
        }

        if (stderr !== '') {
            console.info(chalk.red(stderr));
        }

        return stdout;
    }
}




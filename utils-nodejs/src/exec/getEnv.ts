import chalk from 'chalk';
import type { SpawnArgsType } from './SpawnArgsType.ts';

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

export const showLog = (spawnArgs: SpawnArgsType) => {
    const { command, args, sshLogin, cwd, env } = spawnArgs;

    console.info(chalk.green(JSON.stringify({
        command,
        args,
        sshLogin: sshLogin ?? undefined,
        cwd,
        env: getEnv(env),
    }, null, 4)));
};

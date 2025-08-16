import { exec, execSsh, execAndGet, execSshAndGet } from './exec/exec.ts';

type ShellDirType = {
    type: 'local',
    cwd: string,
} | {
    type: 'ssh',
    cwd: string,
    sshCommand: string,
}

export class ShellDir {

    private constructor(private readonly params: ShellDirType) {}

    static fromLocal(cwd: string): ShellDir {
        return new ShellDir({
            type: 'local',
            cwd
        });
    }

    static fromSsh(cwd: string, sshCommand: string): ShellDir {
        return new ShellDir({
            type: 'ssh',
            cwd,
            sshCommand,
        });
    }

    public cd(dir: string): ShellDir {
        switch (this.params.type) {
            case 'local': {
                return new ShellDir({
                    type: 'local',
                    cwd: [this.params.cwd, dir].join('/'),
                });
            }
            case 'ssh': {
                return new ShellDir({
                    type: 'ssh',
                    cwd: [this.params.cwd, dir].join('/'),
                    sshCommand: this.params.sshCommand,
                });
            }
        }
    }

    async exec(params: { command: string, argsIn?: Array<string>, env?: Record<string, string>}): Promise<void> {
        const {command, argsIn = [], env = {}} = params;

        switch (this.params.type) {
            case 'local': {
                await exec({
                    cwd: this.params.cwd,
                    commandStr: command,
                    env,
                    argsIn,
                });
                return;
            }
            case 'ssh': {
                if (argsIn.length !== 0) {
                    throw Error('TODO - ssh does not yet support the parameter');
                }

                await execSsh({
                    cwd: this.params.cwd,
                    sshCommand: this.params.sshCommand,
                    remoteCommand: command,
                    env
                });
                return;
            }
        }
    }

    execAndGet(params: { command: string, argsIn?: Array<string>, env?: Record<string, string>}): Promise<{
        code: number;
        stdout: string;
        stderr: string;
    }> {
        const {command, argsIn = [], env = {}} = params;

        switch (this.params.type) {
            case 'local': {
                return execAndGet({
                    cwd: this.params.cwd,
                    commandStr: command,
                    env,
                    argsIn,
                })
            }
            case 'ssh': {
                if (argsIn.length !== 0) {
                    throw Error('TODO - ssh does not yet support the parameter');
                }

                return execSshAndGet({
                    cwd: this.params.cwd,
                    sshCommand: this.params.sshCommand,
                    remoteCommand: command,
                    env
                });
            }
        }
    }
}




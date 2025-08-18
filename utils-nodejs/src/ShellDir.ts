import { exec, execSsh, execAndGet, execSshAndGet } from './exec/exec.ts';
import { EscapeString } from "./exec/shellEscape.ts";

const escapeArg = (value: string | EscapeString): EscapeString => {
    if (typeof value === 'string') {
        return EscapeString.escape(value);
    }

    return value;
};

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

    async exec(params: {
        command: string,
        args?: Array<string | EscapeString>,
        env?: Record<string, string>
    }): Promise<void> {
        const {command, args = [], env = {}} = params;

        switch (this.params.type) {
            case 'local': {
                await exec({
                    cwd: this.params.cwd,
                    commandStr: command,
                    argsIn: args.map(escapeArg),
                    env,
                });
                return;
            }
            case 'ssh': {
                await execSsh({
                    cwd: this.params.cwd,
                    sshCommand: this.params.sshCommand,
                    remoteCommand: command,
                    argsIn: args.map(escapeArg),
                    env
                });
                return;
            }
        }
    }

    execAndGet(params: { command: string, args?: Array<string | EscapeString>, env?: Record<string, string>}): Promise<string> {
        const {command, args = [], env = {}} = params;

        switch (this.params.type) {
            case 'local': {
                return execAndGet({
                    cwd: this.params.cwd,
                    commandStr: command,
                    argsIn: args.map(escapeArg),
                    env,
                })
            }
            case 'ssh': {
                return execSshAndGet({
                    cwd: this.params.cwd,
                    sshCommand: this.params.sshCommand,
                    remoteCommand: command,
                    argsIn: args.map(escapeArg),
                    env,
                });
            }
        }
    }
}




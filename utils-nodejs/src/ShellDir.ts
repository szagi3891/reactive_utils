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

    async exec(commandStr: string, env = {}): Promise<void> {
        switch (this.params.type) {
            case 'local': {
                await exec(this.params.cwd, commandStr, env);
                return;
            }
            case 'ssh': {
                await execSsh(this.params.cwd, this.params.sshCommand, commandStr, env);
                return;
            }
        }
    }

    execAndGet(commandStr: string, env = {}): Promise<{
        code: number;
        stdout: string;
        stderr: string;
    }> {
        switch (this.params.type) {
            case 'local': {
                return execAndGet(this.params.cwd, commandStr, env);
            }
            case 'ssh': {
                return execSshAndGet(this.params.cwd, this.params.sshCommand, commandStr, env);
            }
        }
    }
}




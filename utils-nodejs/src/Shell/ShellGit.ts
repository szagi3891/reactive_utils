import { ShellDir } from "../ShellDir.ts";

export class ShellGit {

    constructor(public readonly shell: ShellDir) {}
    
    
    // git add .
    public async addAll() {
        await this.shell.exec({
            command: 'git add .'
        });
    }


    //git commit -am "autosave"
    public async commit(_message: string) {
        await this.shell.exec({
            command: 'git commit -am "autosave"'
        });
    }
}


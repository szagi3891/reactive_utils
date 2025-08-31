import { ShellDir } from "../ShellDir.ts";

export const copyFile = async (shell: ShellDir, fileIn: string, fileOut: string) => {
    await shell.exec({
        command: 'cp',
        args: [
            fileIn,
            fileOut
        ]
    });
};
import { ShellDir } from "../ShellDir.ts";

export const copyFile = async (shell: ShellDir, fileIn: string, fileOut: string): Promise<void> => {
    await shell.exec({
        command: 'cp',
        args: [
            fileIn,
            fileOut
        ]
    });
};
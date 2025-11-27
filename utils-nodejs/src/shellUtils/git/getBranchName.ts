import { ShellDir } from "../../ShellDir.ts";

export const getBranchName = async (dir: ShellDir): Promise<string> => {
    const branchName = await dir.execAndGet({ command: 'git rev-parse --abbrev-ref HEAD' });

    return branchName.trim();;
};


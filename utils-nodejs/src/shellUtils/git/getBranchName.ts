import type { ShellDir } from "@reactive/utils-nodejs";

export const getBranchName = async (dir: ShellDir): Promise<string> => {
    const branchName = await dir.execAndGet({ command: 'git rev-parse --abbrev-ref HEAD' });

    return branchName.trim();;
};


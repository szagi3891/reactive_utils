import type { ShellDir } from '@reactive/utils-nodejs';

export const getBranchCommitCount = async (dir: ShellDir, branch: string): Promise<number> => {  
    const result = await dir.execAndGet({ command: `git rev-list --count`, args: [ branch ] });

    const count = Number(result);
    if (isNaN(count)) {
        throw Error('problem with reading the number of commits')
    }
    return count;
};



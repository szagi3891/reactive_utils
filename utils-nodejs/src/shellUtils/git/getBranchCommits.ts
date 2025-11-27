import { ShellDir } from "../../ShellDir.ts";
import { getBranchCommitCount } from "./getBranchCommitCount.ts";

export const getBranchCommits = async (dir: ShellDir, branch: string): Promise<Array<string>> => {
    const result = await dir.execAndGet({ command: `git log ${branch} --pretty=format:%H` });

    const lines = result.split('\n').filter((line) => (line.trim() === '' ? false : true));

    const count = await getBranchCommitCount(dir, branch);
    if (lines.length !== count) {
        throw Error('problem with reading the list of commits');
    }

    return lines;
};

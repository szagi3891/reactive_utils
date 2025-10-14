import type { ChildProcessWithoutNullStreams} from 'node:child_process';
import process from "node:process";

export const waitForExit = (child: ChildProcessWithoutNullStreams): Promise<number> => {
    const onSigint = () => {
        console.log("Caught SIGINT. Killing child process.");
        child.kill();
    };

    process.on('SIGINT', onSigint);

    return new Promise((resolve, reject) => {
        child.on('close', (code) => {
            process.removeListener('SIGINT', onSigint);
            
            if (code === null) {
                throw Error('Code: expected nuumber');
            }

            resolve(code);
        });

        child.on('error', (err) => {
            process.removeListener('SIGINT', onSigint);
            reject(err);
        });
    });
};


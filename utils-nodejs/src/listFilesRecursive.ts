import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Iterates through a directory recursively, yielding each file and subdirectory.
 * @param {string} dirPath The starting directory path.
 * @returns {AsyncGenerator<string, void, unknown>} An async generator that yields file paths.
 */
export async function* listFilesRecursive(dirPath: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // Recursively yield all files from the subdirectory
            yield* listFilesRecursive(fullPath);
        } else {
            // Yield the file path
            yield fullPath;
        }
    }
}

export async function* listTopLevelDirs(dirPath: string): AsyncGenerator<string> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            // Yield the file path
            yield fullPath;
        }
    }
}


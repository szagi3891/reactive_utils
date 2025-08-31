import { type ShellDir } from "@reactive/utils-nodejs";

export const convertToWebp = async (shell: ShellDir, fileIn: string, fileOut: string) => {

    //cwebp -q 80 "$file" -o "${file%.*}.webp


    //cwebp -q 80 -metadata all "$file" -o "${file%.*}.webp"


    await shell.exec({
        command: 'cwebp',
        args: [
            '-q', '80',
            '-metadata', 'all',
            fileIn,
            '-o', fileOut
        ]
    })
};


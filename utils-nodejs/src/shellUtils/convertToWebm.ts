import { ShellDir } from "../ShellDir.ts";

/**
 * 
 * Info: Jak się uruchomi program Shutter Encoder i w trakcie jak on konwertuje pllik wciepie się grepa po procesach, to można złapać parametry
 * ps -A | grep ffmpeg
 * ffmpeg -strict -2 -hide_banner -threads 0 -hwaccel none -i /Users/grzegorz/Desktop/test/MVI_8065.AVI -c:v libvpx-vp9 -row-mt 1 -b:v 444k -speed 4 -map v:0 -c:a libopus -ar 48k -b:a 192k -map a? -pix_fmt yuv420p -sws_flags bicubic -metadata creation_time=2025-08-31T05:35:25.267825Z -y /Users/grzegorz/Desktop/test/MVI_8065.webm
 * 
 */
export const convertToWebm = async (shell: ShellDir, fileIn: string, fileOut: string): Promise<void> => {
    await shell.exec({
        command: 'ffmpeg',
        args: [
            '-strict', '-2',
            '-hide_banner',
            '-threads', '0',
            '-hwaccel', 'none',
            // '-i', 'MVI_8078.AVI',
            '-i', fileIn,

            '-c:v', 'libvpx-vp9',
            '-row-mt', '1',
            
            '-b:v', '444k',
            '-speed', '4',
            '-map', 'v:0',

            '-c:a', 'libopus',
            '-ar', '48k',
            '-b:a', '192k',
            '-map', 'a?',
            '-pix_fmt', 'yuv420p',
            '-sws_flags', 'bicubic',
            // '-metadata', 'creation_time=2025-08-31T05:35:25.267825Z',
            // '-map_metadata', '0',           //kopiuje metadane z wejściowego pliku (#0) do wyjściowego

            // -y /Users/grzegorz/Desktop/test/MVI_8065.webm

            // 'MVI_8078-3.webm'
            fileOut,
        ]
    });
}
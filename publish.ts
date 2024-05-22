// console.info('podbijam wersję ');
import fs from 'fs';
import { z } from 'zod';

const ContentZod = z.object({
    name: z.string(),
    version: z.string(),
    exports: z.string(),
});

const throwNever = (): never => {
    throw Error('Never ...');
};

const main = async (): Promise<void> => {

    const content = ContentZod.parse(JSON.parse((await fs.promises.readFile('./jsr.json')).toString()));

    const version = content.version;

    console.info(version);

    const chunks = version.split('.');
    const last = chunks[chunks.length - 1] ?? throwNever();
    const lastNumber = parseInt(last, 10) + 1;
    chunks[chunks.length - 1] = lastNumber.toString();

    const nextVersion = chunks.join('.');
    content.version = nextVersion;

    await fs.promises.writeFile('./jsr.json', JSON.stringify(content, null, 4));

    console.info(`git commit -am "version ${nextVersion}" && npx jsr publish`);
};

main().then(() => {
    console.info('koniec');
}).catch((error) => {
    console.error(error);
});


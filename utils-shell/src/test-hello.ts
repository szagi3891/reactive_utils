import { timeout } from '@reactive/utils';


console.info('test hello ...');

for (let i=0; i<10; i++) {
    console.info('iter ...', i);

    await timeout(1000);
}

console.info('end');
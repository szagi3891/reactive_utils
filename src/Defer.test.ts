
import { expect } from "jsr:@std/expect";
import { Defer } from './Defer.ts';
import { timeout } from './timeout.ts';

Deno.test('Defer', async () => {
    const out: Array<string> = [];

    const main22 = async (): Promise<void> => {
        out.push('111');

        await using ddd1 = Defer.from(async () => {
            out.push('ddd1');
            await timeout(1000);
            out.push('ddd2');
        });
    
        out.push('222');

        await using ddd2 = Defer.from(async () => {
            out.push('ooo2');
            await timeout(1000);
            out.push('ooo3');
        });

        console.info(ddd1, ddd2);
    };

    await main22();

    expect(out).toEqual([
        "111",
        "222",
        "ooo2",
        "ooo3",
        "ddd1",
        "ddd2",
    ]);
    
});


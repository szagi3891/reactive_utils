import v8 from 'node:v8';
// var v8 = require("node:v8");
// var vm = require('node:vm');
import vm from 'node:vm';
import { timeout } from "./timeout.ts";

v8.setFlagsFromString('--expose_gc');

const gcFunc = vm.runInNewContext('gc');

//https://www.npmjs.com/package/expose-gc

// "_test": "node --expose-gc ./node_modules/.bin/vitest --run",

// https://github.com/pnpm/pnpm/issues/2097

//Odpala gc

export const gc = async () => {
    gcFunc();
    await timeout(2000);
}

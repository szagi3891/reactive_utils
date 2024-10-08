var v8 = require("v8");
var vm = require('vm');

v8.setFlagsFromString('--expose_gc');

const gcFunc = vm.runInNewContext('gc');

//https://www.npmjs.com/package/expose-gc

// "_test": "node --expose-gc ./node_modules/.bin/vitest --run",

// https://github.com/pnpm/pnpm/issues/2097

//Odpala gc

export const gc = () => {
    gcFunc();
}

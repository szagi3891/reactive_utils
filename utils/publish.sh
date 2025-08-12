set -e

#npm run ts-check
deno check ./index.ts
deno check ./src/nodejs/index.ts

#npm run test
deno run test

#npx tsx ./publish.ts
deno run -A ./publish.ts


#npx jsr publish


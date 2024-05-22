set -e

npm run ts-check
npm run test

npx tsx ./publish.ts

#npx jsr publish


import { buildIndex } from './library';

// Started by rescan.ts as its own process so a full scan never blocks the server.
// Usage: node build/node/reindexJob.js <libraryPath> <dbPath>; prints the stats as JSON.
const [libraryPath, dbPath] = process.argv.slice(2);
process.stdout.write(JSON.stringify(buildIndex({ libraryPath, dbPath })));

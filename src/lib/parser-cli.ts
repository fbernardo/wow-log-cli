#!/usr/bin/env npx tsx

import { runCli } from './cli/index';

const code = runCli(process.argv.slice(2));
process.exit(code);

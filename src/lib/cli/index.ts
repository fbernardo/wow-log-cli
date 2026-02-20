import { readFileSync, writeFileSync } from 'fs';
import { parseCliArgs, parseLog, runCommand, type CliOptions } from './query-engine';
import { parseEncounterIndex } from './encounter-index';
import { formatResult, semantics } from './output';

export function usage() {
  console.error('Usage:');
  console.error('  npx tsx src/lib/parser-cli.ts fight list --input <logfile>');
  console.error('  npx tsx src/lib/parser-cli.ts ability events --input <logfile> --encounter <id|name> --player <name> --ability <name>');
  console.error('  npx tsx src/lib/parser-cli.ts events search --input <logfile> [filters]');
}

export function runCli(argv: string[]) {
  const { command, options } = parseCliArgs(argv);
  if (command.length === 0) {
    usage();
    return 1;
  }

  const input = options.input;
  if (!input) {
    console.error('Missing required --input <path|- >');
    return 1;
  }

  const content = input === '-' ? readFileSync(0, 'utf-8') : readFileSync(input, 'utf-8');

  let result: any;
  const [a, b] = command;

  // Fast path: fight list only needs encounter boundaries, not full event retention.
  if (a === 'fight' && b === 'list') {
    let fights = parseEncounterIndex(content).map((e) => e.info);

    if (options.encounter) {
      const q = String(options.encounter).toLowerCase();
      const asNum = Number(options.encounter);
      fights = Number.isNaN(asNum)
        ? fights.filter((f) => f.bossName.toLowerCase().includes(q))
        : fights.filter((f) => f.encounterId === asNum);
    }

    result = {
      semantics: semantics(!!options.enemyOnly),
      fights,
    };
  } else {
    const parsed = parseLog(content);
    result = runCommand(parsed, command, options);
  }

  const out = formatResult(result, options.format, !!options.compact);
  writeOutput(out, options);
  return 0;
}

function writeOutput(out: string, options: CliOptions) {
  if (options.out) writeFileSync(options.out, out, 'utf-8');
  else console.log(out);
}

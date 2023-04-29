import { promises as fs } from "fs";
import { Command } from "commander";
import chalk from "chalk";

const program = new Command();

program
  .name("assets-optimizer")
  .version("0.0.1")
  .description("Optimize assets with various formats");

program
  .argument("<DIR>", "Source directory")
  .option("-o, --output <DIR>", "Output directory (temp by default)")
  .option("-r, --replace", "Replace files in source directory");

program.showHelpAfterError();

program.configureOutput({
  writeOut: (str) => writeOut(str),
  writeErr: (str) => writeError(str),
  outputError: (str, write) => write(chalk.red(str)),
})

function writeError(str: string) {
  process.stderr.write(chalk.red(str));
}

function writeOut(str: string) {
  process.stdout.write(chalk.blue(str));
}

program.parse();

const options = program.opts();
const dir = program.args[0];

async function main() {
  try {
    writeOut(`Optimizing assets in ${dir}...\n`)
    const files = await fs.readdir(dir);
    console.log(files);
  } catch (err: unknown) {
    if (err instanceof Error)
      writeError(err.message);
  }
}

main();

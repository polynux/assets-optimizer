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

type Files = string[];

async function listFiles(dir: string) {
  try {
    const files: Files = await fs.readdir(dir);
    if (!files?.length) return [];

    for (let file of files) {
      const path = `${dir}/${file}`;
      const stat = await fs.stat(path);
      if (stat.isDirectory()) {
        const subFiles = await listFiles(path);
        if (subFiles?.length) {
          files.push(...subFiles.map((f) => `${file}/${f}`));
        }
      }
    }
    return files;
  } catch (err: unknown) {
    if (err instanceof Error) {
      writeError(err.message);
    }
  }

  return [];
}

async function getImages(dir: string) {
  try {
    const files: Files = await listFiles(dir);
    if (!files?.length) return [];

    const images = files.filter((file) => {
      const ext = file.split(".").pop();
      return ext === "png" || ext === "jpg";
    })

    return images;
  } catch (err: unknown) {
    if (err instanceof Error) {
      writeError(err.message);
    }
  }

  return [];
}

async function main() {
  writeOut("Here are the images:");
  writeOut("\n");
  for (let image of await getImages(dir)) {
    writeOut(`- ${image}`);
    writeOut("\n");
  }
}

main();

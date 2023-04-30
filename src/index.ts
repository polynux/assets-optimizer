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
  const files: Files = [];
  try {
    const filesTemp: Files = await fs.readdir(dir);
    if (!filesTemp?.length) return files;

    for (let file of filesTemp) {
      const path = `${dir}/${file}`;
      const stat = await fs.stat(path);
      if (stat.isDirectory()) {
        const subFiles = await listFiles(path);
        if (subFiles?.length) {
          files.push(...subFiles.map((f) => `${file}/${f}`));
        }
      } else {
        files.push(file);
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      writeError(err.message);
    }
  }

  return files;
}

const imgExtensions = ["png", "jpg", "jpeg", "gif", "svg"];

async function getImages(dir: string) {
  try {
    const files: Files = await listFiles(dir);
    if (!files?.length) return [];

    const images = files.filter((file) => {
      const ext = file.split(".").pop();
      return ext && imgExtensions.includes(ext);
    })

    return images;
  } catch (err: unknown) {
    if (err instanceof Error) {
      writeError(err.message);
    }
  }

  return [];
}

async function printImages() {
  writeOut("Here are the images:");
  writeOut("\n");
  for (let image of await getImages(dir)) {
    writeOut(`- ${image}`);
    writeOut("\n");
  }
}

printImages();

async function printFiles() {
  writeOut("Here are the files:");
  writeOut("\n");
  for (let file of await listFiles(dir)) {
    writeOut(`- ${file}`);
    writeOut("\n");
  }
}

// printFiles();

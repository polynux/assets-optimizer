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
  .option(
    "-o, --output <DIR>",
    "Output directory (converted by default)",
    "converted"
  )
  .option("-r, --replace", "Replace files in source directory");

program.showHelpAfterError();

program.configureOutput({
  writeOut: (str) => writeOut(str),
  writeErr: (str) => writeError(str),
  outputError: (str, write) => write(chalk.red(str)),
});

function writeError(str: string) {
  process.stderr.write(chalk.red(str));
}

function writeOut(str: string) {
  process.stdout.write(chalk.blue(str));
}

program.parse();

const options = program.opts();
const dir = program.args[0].replace(/\/$/, "");

type File = string;
type Files = File[];

class MediaOptimizer {
  private files: Files = [];
  private dir: string;
  private imgExtensions = ["png", "jpg", "jpeg", "gif", "svg"];
  private videosExtensions = ["mp4", "webm", "mkv"];
  private images: Files = [];
  private videos: Files = [];

  constructor(dir: string) {
    this.dir = dir;
  }

  async init() {
    this.checkOutputDir();
    await this.listFiles(this.dir);
    this.classifyFiles();
  }

  async listFiles(dir: string) {
    try {
      const filesTemp: Files = await fs.readdir(dir);
      if (!filesTemp.length) return;

      for (let file of filesTemp) {
        const path = `${dir}/${file}`;
        const stat = await fs.stat(path);
        if (stat.isDirectory()) {
          await this.listFiles(path);
        } else {
          this.files.push(path);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        writeError(err.message + "\n");
        writeOut("Files length: " + this.files.length + "\n");
      }
    }
  }

  async printFiles() {
    writeOut("Here are the files:");
    writeOut("\n");
    for (let file of this.files) {
      writeOut(`- ${file}`);
      writeOut("\n");
    }
  }

  filterFilesByExtensions(extensions: string[]) {
    return this.files.filter((file) => {
      const ext = file.split(".").pop();
      return ext && extensions.includes(ext);
    });
  }

  classifyFiles() {
    this.images = this.filterFilesByExtensions(this.imgExtensions);
    this.videos = this.filterFilesByExtensions(this.videosExtensions);
  }

  async printImages() {
    writeOut("Here are the images:");
    writeOut("\n");
    for (let file of this.images) {
      writeOut(`- ${file}`);
      writeOut("\n");
    }
  }

  async printVideos() {
    writeOut("Here are the videos:");
    writeOut("\n");
    for (let file of this.videos) {
      writeOut(`- ${file}`);
      writeOut("\n");
    }
  }

  async checkOutputDir() {
    const outputDir = `${this.dir}/../${options.output}`;
    try {
      await fs.access(outputDir);
    } catch (err: unknown) {
      if (err instanceof Error) {
        await fs.mkdir(outputDir);
        let dirPath = this.dir.split("/");
        dirPath.pop();
        writeOut(
          `Output directory created at ${dirPath.join("/")}/${options.output}\n`
        );
      }
    }
  }
}

const mediaOptimizer = new MediaOptimizer(dir);

mediaOptimizer.init();

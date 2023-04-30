#!/usr/bin/env node
import { promises as fs } from "fs";
import { exec as execCallback } from "child_process";
import { Command } from "commander";
import chalk from "chalk";
const program = new Command();
program
    .name("assets-optimizer")
    .version("0.0.1")
    .description("Optimize assets with various formats");
program
    .argument("<DIR>", "Source directory")
    .option("-o, --output <DIR>", "Output directory (converted by default)", "converted")
    .option("-r, --replace", "Replace files in source directory");
program.showHelpAfterError();
program.configureOutput({
    writeOut: (str) => writeOut(str),
    writeErr: (str) => writeError(str),
    outputError: (str, write) => write(chalk.red(str)),
});
function writeError(str) {
    process.stderr.write(chalk.red(str));
}
function writeOut(str) {
    process.stdout.write(chalk.blue(str));
}
program.parse();
import sqlite3 from "sqlite3";
const Database = sqlite3.verbose().Database;
const options = program.opts();
const dir = program.args[0].replace(/\/$/, "");
class MediaOptimizer {
    files = [];
    dir;
    imgExtensions = ["png", "jpg", "jpeg", "gif", "svg"];
    videosExtensions = ["mp4", "webm", "mkv"];
    images = [];
    videos = [];
    constructor(dir) {
        this.dir = dir;
    }
    async init() {
        await this.checkDependencies();
        this.checkOutputDir();
        await this.listFiles(this.dir);
        this.classifyFiles();
        // await this.removeConvertedFiles();
    }
    async listFiles(dir) {
        try {
            const filesTemp = (await fs.readdir(dir)).map((file) => {
                return { path: `${dir}/${file}` };
            });
            if (!filesTemp.length)
                return;
            for (let file of filesTemp) {
                const stat = await fs.stat(file.path);
                if (stat.isDirectory()) {
                    await this.listFiles(file.path);
                }
                else {
                    file.mimeType = (await this.getMimeType(file.path)).stdout.trim();
                    if (file.mimeType === "image/webp") {
                        file.converted = true;
                    }
                    if (file.mimeType === "video/mp4") {
                        file.codec = (await this.getVideoCodec(file.path)).stdout.trim();
                        if (file.codec === "hevc") {
                            file.converted = true;
                        }
                    }
                    this.files.push(file);
                }
            }
        }
        catch (err) {
            if (err instanceof Error) {
                writeError(err.message + "\n");
                writeOut("Files length: " + this.files.length + "\n");
            }
            else {
                console.log(err);
            }
        }
    }
    async printFiles() {
        writeOut("Here are the files:");
        writeOut("\n");
        for (let file of this.files) {
            writeOut(`- ${file.path}`);
            writeOut("\n");
        }
    }
    filterFilesByExtensions(extensions) {
        return this.files.filter((file) => {
            const ext = file.path.split(".").pop();
            return ext && extensions.includes(ext);
        });
    }
    classifyFiles() {
        this.images = this.filterFilesByExtensions(this.imgExtensions);
        this.videos = this.filterFilesByExtensions(this.videosExtensions);
    }
    async printImages() {
        if (!this.images.length)
            return;
        writeOut("Here are the images:");
        writeOut("\n");
        for (let file of this.images) {
            writeOut(`- ${file.path}`);
            writeOut("\n");
        }
    }
    async printVideos() {
        if (!this.videos.length)
            return;
        writeOut("Here are the videos:");
        writeOut("\n");
        for (let file of this.videos) {
            writeOut(`- ${file.path}`);
            writeOut("\n");
        }
    }
    async checkOutputDir() {
        const outputDir = `${this.dir}/../${options.output}`;
        try {
            await fs.access(outputDir);
        }
        catch (err) {
            if (err instanceof Error) {
                await fs.mkdir(outputDir);
                let dirPath = this.dir.split("/");
                dirPath.pop();
                writeOut(`Output directory created at ${dirPath.join("/")}/${options.output}\n`);
            }
        }
    }
    async checkDependencies() {
        const dependencies = ["ffmpeg", "cwebp"];
        const errors = [];
        for (let dep of dependencies) {
            try {
                await exec(`which ${dep}`);
            }
            catch (err) {
                if (err instanceof Error) {
                    errors.push(dep);
                }
            }
        }
        if (errors.length) {
            writeError(`Please install ${errors.join(", ")}\n`);
            process.exit(1);
        }
    }
    async getMimeType(file) {
        const { stdout, stderr, err } = await exec(`file --mime-type -b "${file}"`);
        return { stdout, stderr, err };
    }
    async getVideoCodec(file) {
        const { stdout, stderr, err } = await exec(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${file}"`);
        return { stdout, stderr, err };
    }
    /*
    * TODO
    * Convert images to webp
    * */
    async convertImages() {
        for (let file of this.images) {
            const { stdout, stderr, err } = await exec(`cwebp -q 80 ${file} -o ${file}.webp`);
            if (err) {
                writeError(err.message + "\n");
                writeError(stderr + "\n");
                writeError(stdout + "\n");
            }
        }
    }
    /*
     * Write file list to a sqlite database
     * */
    async writeFilesToDb() {
        const db = new Database(`${this.dir}/../${options.output}/files.db`);
        db.serialize(async () => {
            db.run("CREATE TABLE IF NOT EXISTS files (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, converted BOOLEAN DEFAULT 0, codec TEXT)");
            const stmt = db.prepare("INSERT INTO files (name, codec, converted) VALUES (?, ?, ?)");
            for (let file of this.files) {
                stmt.run(file.path, file.codec || file.mimeType, file.converted ? 1 : 0);
            }
            stmt.finalize();
        });
        db.close();
    }
}
function exec(command) {
    return new Promise((resolve, reject) => {
        execCallback(command, (err, stdout, stderr) => {
            if (err) {
                reject({ err, stdout, stderr });
            }
            else {
                resolve({ err: null, stdout, stderr });
            }
        });
    });
}
const mediaOptimizer = new MediaOptimizer(dir);
mediaOptimizer.init().then(() => {
    mediaOptimizer.writeFilesToDb();
});

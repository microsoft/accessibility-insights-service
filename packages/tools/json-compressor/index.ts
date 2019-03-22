// tslint:disable: non-literal-fs-path
import * as fs from 'fs';
import * as path from 'path';
import { Arguments, argv } from 'yargs';

interface RunConfig {
    jsonFile: string;
}

class FileInfo {
    public absolutePath: string;
    public parsedPath: path.ParsedPath;
}

function getFileInfo(fileName: string): FileInfo {
    const fileInfo = new FileInfo();
    fileInfo.absolutePath = path.normalize(path.isAbsolute(fileName) ? fileName : `${__dirname}\\${fileName}`);
    fileInfo.parsedPath = path.parse(fileInfo.absolutePath);

    return fileInfo;
}

function compressJson(fileName: string): void {
    const fileInfo = getFileInfo(fileName);
    if (!fs.existsSync(fileInfo.absolutePath)) {
        console.log(`File not found: ${fileInfo.absolutePath}`);

        return;
    }

    const data = fs.readFileSync(fileInfo.absolutePath, 'utf8');
    const dataObj = JSON.parse(data);
    const dataJson = JSON.stringify(dataObj);
    const base64String = Buffer.from(dataJson).toString('base64');
    fs.writeFileSync(`${fileInfo.parsedPath.dir}\\${fileInfo.parsedPath.name}.base64.txt`, base64String);

    const dataJsonEcho = Buffer.from(base64String, 'base64').toString();
    fs.writeFileSync(`${fileInfo.parsedPath.dir}\\${fileInfo.parsedPath.name}.compressed${fileInfo.parsedPath.ext}`, dataJsonEcho);
}

const runConfig = argv as Arguments<RunConfig>;

if (runConfig.jsonFile !== undefined && runConfig.jsonFile.length > 0) {
    compressJson(runConfig.jsonFile);
} else {
    console.log(`
    Usage: node index.js <command>

    where <command> is
      jsonFile

    --jsonFile=<path to JSON file to compress>  compress JSON file
    `);
}

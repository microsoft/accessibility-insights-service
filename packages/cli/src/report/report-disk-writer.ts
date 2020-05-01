// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import * as filenamify from 'filenamify-url';
import * as fs from 'fs';
import { injectable } from 'inversify';
import { isEmpty } from 'lodash';

@injectable()
export class ReportDiskWriter {
    constructor(private readonly fileSystemObj: typeof fs = fs) {}

    public writeToDirectory(directory: string, fileName: string, format: string, content: string): void {
        if (isEmpty(directory)) {
            directory = '.';
        }

        const reportFileName = `${directory}/${filenamify(fileName, { replacement: '_' })}.${format}`;

        if (!this.fileSystemObj.existsSync(directory)) {
            console.log('output directory does not exists.');
            console.log(`creating output directory - ${directory}`);
            this.fileSystemObj.mkdirSync(directory);
        }

        this.fileSystemObj.writeFileSync(reportFileName, content);

        // this.fileSystemObj.exists(directory, async (exists) => {
        //     if (!exists) {
        //         console.log('output directory does not exists.');
        //         console.log(`creating output directory - ${directory}`);
        //         this.fileSystemObj.mkdir(directory, async (error) => {
        //             if (error) {
        //                 return console.error(error);
        //             }
        //             await this.writeFile(reportFileName, content);
        //         });
        //     } else {
        //         await this.writeFile(reportFileName, content);
        //     }
        // })
    }

    // private async writeFile(fileName: string, content: string): Promise<void> {
    //     this.fileSystemObj.writeFile(fileName, content, (error) => {
    //         if (error) {
    //             return console.error(error);
    //         }
    //         console.log(`scan report saved successfully ${fileName}`);
    //     });
    // }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { isEmpty } from 'lodash';
import { CommandRunner } from './runner/command-runner';
import { FileCommandRunner } from './runner/file-command-runner';
import { URLCommandRunner } from './runner/url-command-runner';
import { ScanArguments } from './scanner/scan-arguments';

export class CliEntryPoint {
    constructor(private readonly container: Container) {}

    public async runScan(scanArguments: ScanArguments): Promise<void> {
        const commandRunner = this.commandRunnerFactory(scanArguments);
        await commandRunner.runCommand(scanArguments);
    }

    private commandRunnerFactory(scanArguments: ScanArguments): CommandRunner {
        if (!isEmpty(scanArguments.url)) {
            return this.container.get(URLCommandRunner);
        } else if (!isEmpty(scanArguments.filePath)) {
            return this.container.get(FileCommandRunner);
        } else {
            throw new Error('You should input either url or filePath (only one)!');
        }
    }
}

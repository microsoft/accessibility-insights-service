// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Container } from 'inversify';
import { CommandRunner } from './command-runner';
import { ScanArguments } from './scanner/scan-arguments';

export class CliEntryPoint {
    constructor(private readonly container: Container) {}

    public async runScan(scanArguments: ScanArguments): Promise<void> {
        const commandRunner = this.container.get(CommandRunner);
        await commandRunner.runCommand(scanArguments);
    }
}

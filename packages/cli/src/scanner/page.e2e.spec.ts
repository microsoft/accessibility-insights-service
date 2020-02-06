// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as path from 'path';
import { CliEntryPoint } from '../cli-entry-point';
import { setupCliContainer } from '../setup-cli-container';
describe('PageE2e', () => {
    it('e2e test', async () => {
        const cliEntryPoint = new CliEntryPoint(setupCliContainer());
        const output = path.resolve(__dirname, 'reports');

        await cliEntryPoint.runScan({
            url: 'https://www.washington.edu/accesscomputing/AU/before.html',
            output: output,
        });

        console.log('report stored under ', output);
    }, 10000);
});

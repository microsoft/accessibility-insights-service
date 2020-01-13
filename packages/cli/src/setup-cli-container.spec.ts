// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { CommandRunner } from './command-runner';
import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { ReportGenerator } from './report/report-generator';
import { AIScanner } from './scanner/ai-scanner';
import { setupCliContainer } from './setup-cli-container';

describe(setupCliContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCliContainer();

        expect(container.get(AIScanner)).toBeDefined();
        expect(container.get(ReportGenerator)).toBeDefined();
        expect(container.get(CommandRunner)).toBeDefined();
        expect(container.get(AxePuppeteerFactory)).toBeDefined();
    });
});

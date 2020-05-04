// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { AxePuppeteerFactory } from './factories/axe-puppeteer-factory';
import { ReportDiskWriter } from './report/report-disk-writer';
import { ReportGenerator } from './report/report-generator';
import { ConsoleSummaryReportGenerator } from './report/summary-report/console-summary-report-generator';
import { JsonSummaryReportGenerator } from './report/summary-report/json-summary-report-generator';
import { FileCommandRunner } from './runner/file-command-runner';
import { URLCommandRunner } from './runner/url-command-runner';
import { AIScanner } from './scanner/ai-scanner';
import { setupCliContainer } from './setup-cli-container';

describe(setupCliContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCliContainer();

        expect(container.get(AIScanner)).toBeDefined();
        expect(container.get(ReportGenerator)).toBeDefined();
        expect(container.get(URLCommandRunner)).toBeDefined();
        expect(container.get(FileCommandRunner)).toBeDefined();
        expect(container.get(ReportDiskWriter)).toBeDefined();
        expect(container.get(AxePuppeteerFactory)).toBeDefined();
        expect(container.get(ConsoleSummaryReportGenerator)).toBeDefined();
        expect(container.get(JsonSummaryReportGenerator)).toBeDefined();
    });
});

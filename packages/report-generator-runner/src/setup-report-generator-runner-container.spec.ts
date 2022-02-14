// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Runner } from './runner/runner';
import { setupReportGeneratorRunnerContainer } from './setup-report-generator-runner-container';

describe(setupReportGeneratorRunnerContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupReportGeneratorRunnerContainer();

        expect(container.get(Runner)).toBeDefined();
    });
});

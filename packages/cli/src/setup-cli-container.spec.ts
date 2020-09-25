// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CrawlerEntryPoint } from 'accessibility-insights-crawler';
import { setupCliContainer } from './setup-cli-container';

describe(setupCliContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCliContainer();

        // eslint-disable-next-line
        expect(container.get('ReporterFactory')).toBeDefined();
        expect(container.get(CrawlerEntryPoint)).toBeDefined();
    });
});

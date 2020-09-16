// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { CrawlerEntryPoint } from 'accessibility-insights-crawler';
import { setupCliContainer } from './setup-cli-container';

describe(setupCliContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCliContainer();

        // tslint:disable-next-line: no-backbone-get-set-outside-model
        expect(container.get('ReporterFactory')).toBeDefined();
        expect(container.get(CrawlerEntryPoint)).toBeDefined();
    });
});

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Crawler } from 'accessibility-insights-crawler';
import { setupCliContainer } from './setup-cli-container';

describe(setupCliContainer, () => {
    it('resolves dependencies', () => {
        const container = setupCliContainer();
        expect(container.get('ReporterFactory')).toBeDefined();
        expect(container.get(Crawler)).toBeDefined();
    });
});

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { Runner } from './runner/runner';
import { setupPrivacyScanRunnerContainer } from './setup-privacy-scan-runner-container';

describe(setupPrivacyScanRunnerContainer, () => {
    it('resolves runner dependencies', () => {
        const container = setupPrivacyScanRunnerContainer();

        expect(container.get(Runner)).toBeDefined();
    });
});

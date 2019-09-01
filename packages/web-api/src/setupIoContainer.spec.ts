// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ScanController } from './controllers/scan-controller';
import { setupIoContainer } from './setupIoContainer';

describe(setupIoContainer, () => {
    it('verify dependencies resolution', () => {
        const container = setupIoContainer();
        expect(container.get(ScanController)).toBeDefined();
    });
});

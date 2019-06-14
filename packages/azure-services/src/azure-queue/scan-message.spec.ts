// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { ScanMessage } from './scan-message';

describe(ScanMessage, () => {
    it('parse queue message body text', () => {
        const message = {
            id: 'id',
            name: 'name',
            baseUrl: 'baseUrl',
            scanUrl: 'scanUrl',
            serviceTreeId: 'serviceTreeId',
        };

        const scanMessage = new ScanMessage(JSON.stringify(message));

        expect(scanMessage).toEqual(message);
    });
});

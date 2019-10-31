// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as request from 'request';
import { IMock, Mock, Times } from 'typemoq';
import { A11yServiceClient } from './a11y-service-client';

// tslint:disable: no-null-keyword
describe(A11yServiceClient, () => {
    const funcAppName = 'app-name';
    let testSubject: A11yServiceClient;
    let requestMock: IMock<typeof request>;
    const apiVersion = '1.0';

    beforeEach(() => {
        requestMock = Mock.ofType<typeof request>(null);
        testSubject = new A11yServiceClient(funcAppName, apiVersion, requestMock.object);
    });

    it('baseUrl', () => {
        expect(testSubject.baseUrl).toEqual(`https://${funcAppName}.azurewebsites.net`);
    });

    it('postScanUrl', () => {
        const scanUrl = 'url';
        const priority = 3;
        const requestBody = [{ url: scanUrl, priority }];

        const options = {
            method: 'POST',
            json: requestBody,
            qs: {
                'api-version': apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
        requestMock.setup(req => req.post(`${testSubject.baseUrl}/scans`, options)).verifiable(Times.once());
        testSubject.postScanUrl(scanUrl, priority);

        requestMock.verifyAll();
    });
});

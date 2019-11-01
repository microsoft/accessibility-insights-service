// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as request from 'request-promise';
import { IMock, Mock, Times } from 'typemoq';
import { A11yServiceClient } from './a11y-service-client';

// tslint:disable: no-null-keyword
describe(A11yServiceClient, () => {
    const apimName = 'app-name';
    let testSubject: A11yServiceClient;
    let requestMock: IMock<typeof request>;
    const apiVersion = '1.0';

    beforeEach(() => {
        requestMock = Mock.ofType<typeof request>(null);
        testSubject = new A11yServiceClient(apimName, apiVersion, requestMock.object);
    });

    it('baseUrl', () => {
        expect(testSubject.baseUrl).toEqual(`https://${apimName}.azure-api.net`);
    });

    it('postScanUrl', async () => {
        const scanUrl = 'url';
        const priority = 3;
        const response = { statusCode: 200 };
        const requestBody = [{ url: scanUrl, priority }];

        const options = {
            json: requestBody,
            qs: {
                'api-version': apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
        requestMock
            .setup(req => req.post(`${testSubject.baseUrl}/scans`, options))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());

        const actualResponse = await testSubject.postScanUrl(scanUrl, priority);
        expect(actualResponse).toEqual(response);

        requestMock.verifyAll();
    });
});

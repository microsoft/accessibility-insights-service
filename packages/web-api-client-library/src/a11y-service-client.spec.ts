// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as request from 'request-promise';
import { IMock, Mock, Times } from 'typemoq';
import { A11yServiceClient } from './a11y-service-client';

// tslint:disable: no-null-keyword
describe(A11yServiceClient, () => {
    const baseUrl = 'base-url';
    let testSubject: A11yServiceClient;
    let requestMock: IMock<typeof request>;
    const apiVersion = '1.0';

    beforeEach(() => {
        requestMock = Mock.ofType<typeof request>(null);
        testSubject = new A11yServiceClient(baseUrl, apiVersion, requestMock.object);
    });

    it('postScanUrl', async () => {
        const scanUrl = 'url';
        const priority = 3;
        const response = { statusCode: 200 };
        const requestBody = [{ url: scanUrl, priority }];
        const options = getRequestOptions(requestBody);

        requestMock
            .setup(req => req.post(`${baseUrl}/scans`, options))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());

        const actualResponse = await testSubject.postScanUrl(scanUrl, priority);
        expect(actualResponse).toEqual(response);

        requestMock.verifyAll();
    });

    it('getScanStatus', async () => {
        const scanId = 'scanid';
        const response = { statusCode: 200 };
        const options = getRequestOptions();

        requestMock
            .setup(req => req.get(`${baseUrl}/scans/${scanId}`, options))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanStatus(scanId);
        expect(actualResponse).toEqual(response);

        requestMock.verifyAll();
    });

    it('getScanReport', async () => {
        const scanId = 'scanid';
        const reportId = 'reportid';
        const response = { statusCode: 200 };
        const options = getRequestOptions();

        requestMock
            .setup(req => req.get(`${baseUrl}/scans/${scanId}/reports/${reportId}`, options))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanReport(scanId, reportId);
        expect(actualResponse).toEqual(response);

        requestMock.verifyAll();
    });

    function getRequestOptions(requestBody?: Object): request.RequestPromiseOptions {
        return {
            json: requestBody,
            qs: {
                'api-version': apiVersion,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        };
    }
});

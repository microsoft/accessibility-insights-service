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
    const requestDefaults = {
        forever: true,
        qs: {
            'api-version': apiVersion,
        },
        headers: {
            'Content-Type': 'application/json',
        },
    };

    beforeEach(() => {
        requestMock = Mock.ofType<typeof request>(null);
        requestMock
            .setup(req => req.defaults(requestDefaults))
            .returns(() => requestMock.object)
            .verifiable(Times.once());
        testSubject = new A11yServiceClient(baseUrl, apiVersion, requestMock.object);
    });

    afterEach(() => {
        requestMock.verifyAll();
    });

    it('postScanUrl', async () => {
        const scanUrl = 'url';
        const priority = 3;
        const response = { statusCode: 200 };
        const requestBody = [{ url: scanUrl, priority }];
        const options = { json: requestBody };
        requestMock
            .setup(req => req.post(`${baseUrl}/scans`, options))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());
        const actualResponse = await testSubject.postScanUrl(scanUrl, priority);
        expect(actualResponse).toEqual(response);
    });

    it('getScanStatus', async () => {
        const scanId = 'scanid';
        const response = { statusCode: 200 };
        requestMock
            .setup(req => req.get(`${baseUrl}/scans/${scanId}`))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());
        const actualResponse = await testSubject.getScanStatus(scanId);
        expect(actualResponse).toEqual(response);
    });

    it('getScanReport', async () => {
        const scanId = 'scanid';
        const reportId = 'reportid';
        const response = { statusCode: 200 };
        requestMock
            .setup(req => req.get(`${baseUrl}/scans/${scanId}/reports/${reportId}`))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());
        const actualResponse = await testSubject.getScanReport(scanId, reportId);
        expect(actualResponse).toEqual(response);
    });
});

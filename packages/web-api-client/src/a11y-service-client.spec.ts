// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { merge } from 'lodash';
import * as request from 'request-promise';
import { IMock, Mock, Times } from 'typemoq';

import { A11yServiceAuthenticationHandler, A11yServiceCredential } from './a11y-service-authentication-handler';
import { A11yServiceClient } from './a11y-service-client';

class TestableA11yServiceClient extends A11yServiceClient {
    public setAuthenticationHandler(authHandler: A11yServiceAuthenticationHandler): void {
        this.authenticationHandler = authHandler;
    }
}

// tslint:disable: no-null-keyword
describe(A11yServiceClient, () => {
    let testSubject: TestableA11yServiceClient;
    let requestMock: IMock<typeof request>;
    let defaultRequestMock: IMock<typeof request>;
    let authHeaderOptions: request.RequestPromiseOptions;
    const baseUrl = 'base-url';
    const apiVersion = '1.0';
    const requestDefaults: request.RequestPromiseOptions = {
        forever: true,
        qs: {
            'api-version': apiVersion,
        },
        headers: {
            'Content-Type': 'application/json',
        },
    };
    let authHandler: IMock<A11yServiceAuthenticationHandler>;
    const accessToken = {
        tokenType: 'type',
        accessToken: 'token',
    };
    const cred: A11yServiceCredential = {
        clientId: 'client-id',
        clientSecret: 'client-secret',
        authorityUrl: 'https://login.foo.com/tenant',
    };
    const resourceId = 'resource-id';

    beforeEach(() => {
        authHeaderOptions = {
            headers: {
                authorization: `${accessToken.tokenType} ${accessToken.accessToken}`,
            },
        };
        requestMock = Mock.ofType<typeof request>(null);
        defaultRequestMock = Mock.ofType<typeof request>(null);
        authHandler = Mock.ofType<A11yServiceAuthenticationHandler>(null);

        requestMock
            .setup(req => req.defaults(requestDefaults))
            .returns(() => defaultRequestMock.object)
            .verifiable(Times.once());
        authHandler
            .setup(cm => cm.getAuthHeaders())
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(authHeaderOptions))
            .verifiable(Times.once());

        testSubject = new TestableA11yServiceClient(cred, resourceId, baseUrl, apiVersion, requestMock.object);
        testSubject.setAuthenticationHandler(authHandler.object);
    });

    afterEach(() => {
        requestMock.verifyAll();
        defaultRequestMock.verifyAll();
    });

    it('postScanUrl', async () => {
        const scanUrl = 'url';
        const priority = 3;
        const response = { statusCode: 200 };
        const requestBody = [{ url: scanUrl, priority }];
        const options = { json: requestBody };
        defaultRequestMock
            .setup(req => req.post(`${baseUrl}/scans`, merge(options, authHeaderOptions)))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());
        const actualResponse = await testSubject.postScanUrl(scanUrl, priority);
        expect(actualResponse).toEqual(response);
    });

    it('getScanStatus', async () => {
        const scanId = 'scanid';
        const response = { statusCode: 200 };
        defaultRequestMock
            .setup(req => req.get(`${baseUrl}/scans/${scanId}`, authHeaderOptions))
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
        defaultRequestMock
            .setup(req => req.get(`${baseUrl}/scans/${scanId}/reports/${reportId}`, authHeaderOptions))
            // tslint:disable-next-line: no-any
            .returns(() => Promise.resolve(response) as any)
            .verifiable(Times.once());
        const actualResponse = await testSubject.getScanReport(scanId, reportId);
        expect(actualResponse).toEqual(response);
    });
});

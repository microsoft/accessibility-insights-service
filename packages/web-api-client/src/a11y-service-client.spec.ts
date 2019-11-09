// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import * as request from 'request-promise';
import { IMock, Mock, Times } from 'typemoq';

import { A11yServiceClient } from './a11y-service-client';
import { A11yServiceCredential } from './a11y-service-credential';

// tslint:disable: no-null-keyword no-unsafe-any no-any
describe(A11yServiceClient, () => {
    let testSubject: A11yServiceClient;
    const baseUrl = 'base-url';
    const apiVersion = '1.0';
    let credMock: IMock<A11yServiceCredential>;
    let requestStub: any;
    let getMock: IMock<(url: string) => {}>;
    let postMock: IMock<(url: string, options?: request.RequestPromiseOptions) => {}>;

    beforeEach(() => {
        getMock = Mock.ofInstance(() => {
            return null;
        });
        postMock = Mock.ofInstance(() => {
            return null;
        });
        requestStub = {
            defaults: (options: request.RequestPromiseOptions) => requestStub,
            get: getMock.object,
            post: postMock.object,
        };
        credMock = Mock.ofType<A11yServiceCredential>(null);

        testSubject = new A11yServiceClient(credMock.object, baseUrl, apiVersion, requestStub);
    });

    afterEach(() => {
        credMock.verifyAll();
        getMock.verifyAll();
        postMock.verifyAll();
    });

    function setupVerifiableSignRequestCall(): void {
        credMock
            .setup(cm => cm.signRequest(requestStub))
            .returns(async () => Promise.resolve(requestStub))
            .verifiable();
    }

    it('postScanUrl', async () => {
        const scanUrl = 'url';
        const priority = 3;
        const response = { statusCode: 200 };
        const requestBody = [{ url: scanUrl, priority }];
        const options = { json: requestBody };
        setupVerifiableSignRequestCall();
        postMock
            .setup(req => req(`${baseUrl}/scans`, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.postScanUrl(scanUrl, priority);

        expect(actualResponse).toEqual(response);
    });

    it('postScanUrl, priority not set', async () => {
        const scanUrl = 'url';
        const response = { statusCode: 200 };
        const requestBody = [{ url: scanUrl, priority: 0 }];
        const options = { json: requestBody };
        setupVerifiableSignRequestCall();
        postMock
            .setup(req => req(`${baseUrl}/scans`, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.postScanUrl(scanUrl);

        expect(actualResponse).toEqual(response);
    });

    it('getScanStatus', async () => {
        const scanId = 'scanId';
        const response = { statusCode: 200 };
        setupVerifiableSignRequestCall();
        getMock
            .setup(req => req(`${baseUrl}/scans/${scanId}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanStatus(scanId);

        expect(actualResponse).toEqual(response);
    });

    it('getScanReport', async () => {
        const scanId = 'scanId';
        const reportId = 'reportId';
        const response = { statusCode: 200 };
        setupVerifiableSignRequestCall();
        getMock
            .setup(req => req(`${baseUrl}/scans/${scanId}/reports/${reportId}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanReport(scanId, reportId);

        expect(actualResponse).toEqual(response);
    });

    it('checkHealth', async () => {
        setupVerifiableSignRequestCall();
        getMock
            .setup(req => req(`${baseUrl}/health`))
            .returns(async () => Promise.resolve(null))
            .verifiable(Times.once());

        await testSubject.checkHealth();
    });

    it('should handle failure request', async () => {
        const errBody = 'err';
        const errCode = 123;
        const errRes = {
            statusCode: errCode,
            body: errBody,
        };
        setupVerifiableSignRequestCall();
        getMock
            .setup(req => req(`${baseUrl}/health`))
            .returns(async () => Promise.reject(errRes))
            .verifiable(Times.once());

        let errResponse;

        await testSubject.checkHealth().catch(err => {
            errResponse = err;
        });

        expect(errResponse).toEqual(errRes);
    });
});

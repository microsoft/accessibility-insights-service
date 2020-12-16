// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { RetryHelper } from 'common';
import { IMock, It, Mock, Times } from 'typemoq';
import { Agents, ExtendOptions, Options } from 'got';
import { A11yServiceClient } from './a11y-service-client';
import { A11yServiceCredential } from './a11y-service-credential';
import { MockableLogger } from './test-utilities/mockable-logger';

/* eslint-disable @typescript-eslint/no-explicit-any, no-empty,@typescript-eslint/no-empty-function */
describe(A11yServiceClient, () => {
    let testSubject: A11yServiceClient;
    const baseUrl = 'base-url';
    const apiVersion = '1.0';
    let credMock: IMock<A11yServiceCredential>;
    let gotStub: any;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let getMock: IMock<(url: string, options?: Options) => {}>;
    // eslint-disable-next-line @typescript-eslint/ban-types
    let postMock: IMock<(url: string, options?: Options) => {}>;
    let retryHelperMock: IMock<RetryHelper<unknown>>;
    let loggerMock: IMock<MockableLogger>;
    let getAgentsMock: IMock<() => Agents>;
    const maxRetryCount = 5;
    const msecBetweenRetries = 10;
    let error: Error;
    const scanUrl = 'url';
    const priority = 3;
    let response: unknown;
    const agentsStub = {};

    beforeEach(() => {
        error = new Error('HTTP 500 Server Error');
        response = { statusCode: 200 };

        getMock = Mock.ofInstance(() => {
            return null;
        });
        postMock = Mock.ofInstance(() => {
            return null;
        });
        gotStub = {
            extend: (options: ExtendOptions) => gotStub,
            get: getMock.object,
            post: postMock.object,
        };
        credMock = Mock.ofType<A11yServiceCredential>(null);
        loggerMock = Mock.ofType<MockableLogger>();
        retryHelperMock = Mock.ofType<RetryHelper<unknown>>();
        getAgentsMock = Mock.ofType<() => Agents>();
        getAgentsMock.setup((ga) => ga()).returns(() => agentsStub);

        testSubject = new A11yServiceClient(
            credMock.object,
            baseUrl,
            loggerMock.object,
            apiVersion,
            false,
            gotStub,
            retryHelperMock.object,
            maxRetryCount,
            msecBetweenRetries,
            getAgentsMock.object,
        );
    });

    afterEach(() => {
        credMock.verifyAll();
        getMock.verifyAll();
        postMock.verifyAll();
        retryHelperMock.verifyAll();
        loggerMock.verifyAll();
    });

    function setupVerifiableSignRequestCall(): void {
        credMock
            .setup((cm) => cm.signRequest(gotStub))
            .returns(async () => Promise.resolve(gotStub))
            .verifiable();
    }

    function setupRetryHelperMock(shouldFail: boolean): void {
        retryHelperMock
            .setup((r) => r.executeWithRetries(It.isAny(), It.isAny(), maxRetryCount, msecBetweenRetries))
            .returns(async (action: () => Promise<unknown>, errorHandler: (error: Error) => Promise<void>, maxAttempts: number) => {
                if (shouldFail) {
                    await action();
                    await errorHandler(error);
                    throw error;
                } else {
                    return action();
                }
            })
            .verifiable();
    }

    function setupLoggerMock(): void {
        loggerMock.setup((o) => o.logError(It.isAny(), It.isAny())).verifiable();
    }

    describe('verify default options', () => {
        test.each([true, false])('verifies when throwOnFailure is %o', (throwOnFailure: boolean) => {
            const extendMock = Mock.ofInstance((options: ExtendOptions): any => {});
            gotStub.extend = extendMock.object;
            extendMock
                .setup((d) =>
                    d({
                        searchParams: {
                            'api-version': '1.0',
                        },
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        responseType: 'json',
                        throwHttpErrors: throwOnFailure,
                        agent: agentsStub,
                    }),
                )
                .returns(() => 'some object' as any)
                .verifiable(Times.once());

            testSubject = new A11yServiceClient(
                credMock.object,
                baseUrl,
                loggerMock.object,
                apiVersion,
                throwOnFailure,
                gotStub,
                retryHelperMock.object,
                maxRetryCount,
                msecBetweenRetries,
                getAgentsMock.object,
            );

            extendMock.verifyAll();
        });
    });

    it('postScanUrl', async () => {
        const requestBody = [{ url: scanUrl, priority }];
        const requestOptions = { json: requestBody };
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        postMock
            .setup((req) => req(`${baseUrl}/scans`, requestOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.postScanUrl(scanUrl, priority);

        expect(actualResponse).toEqual(response);
    });

    it('postScanUrl with retry', async () => {
        const requestBody = [{ url: scanUrl, priority }];
        const requestOptions = { json: requestBody };
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(true);
        setupLoggerMock();
        postMock
            .setup((req) => req(`${baseUrl}/scans`, requestOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await expect(testSubject.postScanUrl(scanUrl, priority)).rejects.toThrowError();
    });

    it('postScanUrl, priority not set', async () => {
        const requestBody = [{ url: scanUrl, priority: 0 }];
        const requestOptions = { json: requestBody };
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        postMock
            .setup((req) => req(`${baseUrl}/scans`, requestOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.postScanUrl(scanUrl);

        expect(actualResponse).toEqual(response);
    });

    it('postConsolidatedScan', async () => {
        const reportId = 'some-report-id';
        const requestBody = [{ url: scanUrl, site: { baseUrl: scanUrl }, reportGroups: [{ consolidatedId: reportId }], priority }];
        const requestOptions = { json: requestBody };

        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        postMock
            .setup((req) => req(`${baseUrl}/scans`, requestOptions))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.postConsolidatedScan(scanUrl, reportId, priority);

        expect(actualResponse).toEqual(response);
    });

    it('getScanStatus', async () => {
        const scanId = 'scanId';
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        getMock
            .setup((req) => req(`${baseUrl}/scans/${scanId}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanStatus(scanId);

        expect(actualResponse).toEqual(response);
    });

    it('getScanStatus with retry', async () => {
        const scanId = 'scanId';
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(true);
        getMock
            .setup((req) => req(`${baseUrl}/scans/${scanId}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await expect(testSubject.getScanStatus(scanId)).rejects.toThrowError();
    });

    it('getScanReport', async () => {
        const scanId = 'scanId';
        const reportId = 'reportId';
        const options: Options = { responseType: 'text' };
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        getMock
            .setup((req) => req(`${baseUrl}/scans/${scanId}/reports/${reportId}`, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanReport(scanId, reportId);

        expect(actualResponse).toEqual(response);
    });

    it('getScanReport with retry', async () => {
        const scanId = 'scanId';
        const reportId = 'reportId';
        const options: Options = { responseType: 'text' };
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(true);
        getMock
            .setup((req) => req(`${baseUrl}/scans/${scanId}/reports/${reportId}`, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await expect(testSubject.getScanReport(scanId, reportId)).rejects.toThrowError();
    });

    it('checkHealth', async () => {
        const suffix = '/abc';
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        getMock
            .setup((req) => req(`${baseUrl}/health${suffix}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await testSubject.checkHealth(suffix);
    });

    it('checkHealth', async () => {
        const suffix = '/abc';
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(true);
        getMock
            .setup((req) => req(`${baseUrl}/health${suffix}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await expect(testSubject.checkHealth(suffix)).rejects.toThrowError();
    });

    it('should handle failure request', async () => {
        const errBody = 'err';
        const errCode = 123;
        const errRes = {
            statusCode: errCode,
            body: errBody,
        };
        setupVerifiableSignRequestCall();
        setupRetryHelperMock(false);
        getMock
            .setup((req) => req(`${baseUrl}/health`))
            .returns(async () => Promise.reject(errRes))
            .verifiable(Times.once());

        let errResponse;

        await testSubject.checkHealth().catch((err) => {
            errResponse = err;
        });

        expect(errResponse).toEqual(errRes);
    });
});

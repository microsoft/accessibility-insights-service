// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { IMock, Mock, Times } from 'typemoq';
import { Agents, ExtendOptions, Options } from 'got';
import { ScanRunRequest } from 'service-library';
import { A11yServiceClient } from './a11y-service-client';
import { A11yServiceCredential } from './a11y-service-credential';
import { PostScanRequestOptions } from './request-options';

/* eslint-disable @typescript-eslint/no-explicit-any */

const baseUrl = 'base-url';
const apiVersion = '1.0';

let testSubject: A11yServiceClient;
let credMock: IMock<A11yServiceCredential>;
let gotStub: any;
// eslint-disable-next-line @typescript-eslint/ban-types
let getMock: IMock<(url: string, options?: Options) => {}>;
// eslint-disable-next-line @typescript-eslint/ban-types
let postMock: IMock<(url: string, options?: Options) => {}>;
let getAgentsMock: IMock<() => Agents>;

describe(A11yServiceClient, () => {
    let response: unknown;
    const agentsStub = {};
    const scanNotifyUrlStub = 'scan-notification-pass-stub';

    beforeEach(() => {
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
        getAgentsMock = Mock.ofType<() => Agents>();
        getAgentsMock.setup((ga) => ga()).returns(() => agentsStub);

        testSubject = new A11yServiceClient(credMock.object, baseUrl, apiVersion, false, gotStub, getAgentsMock.object);
    });

    afterEach(() => {
        credMock.verifyAll();
        getMock.verifyAll();
        postMock.verifyAll();
    });

    describe('verify default options', () => {
        test.each([true, false])('verifies when throwOnFailure is %o', (throwOnFailure: boolean) => {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
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

            testSubject = new A11yServiceClient(credMock.object, baseUrl, apiVersion, throwOnFailure, gotStub, getAgentsMock.object);

            extendMock.verifyAll();
        });
    });

    describe('postScanUrl', () => {
        const scanUrl = 'url';
        const priority = 3;

        it('with priority and notify url', async () => {
            const scanOptions: PostScanRequestOptions = { scanNotificationUrl: scanNotifyUrlStub, priority };
            const requestBody = { url: scanUrl, priority, scanNotifyUrl: scanNotifyUrlStub };
            const requestOptions = { json: createPostScanRequestObj(requestBody) };
            setupVerifiableSignRequestCall();
            postMock
                .setup((req) => req(`${baseUrl}/scans`, requestOptions))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.postScanUrl(scanUrl, scanOptions);

            expect(actualResponse).toEqual(response);
        });

        it('with no options set', async () => {
            const requestBody = { url: scanUrl, priority: 0 };
            const requestOptions = { json: createPostScanRequestObj(requestBody) };
            setupVerifiableSignRequestCall();
            postMock
                .setup((req) => req(`${baseUrl}/scans`, requestOptions))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.postScanUrl(scanUrl);

            expect(actualResponse).toEqual(response);
        });

        it('with consolidated scan id', async () => {
            const reportId = 'some-report-id';
            const scanOptions: PostScanRequestOptions = {
                consolidatedId: reportId,
                scanNotificationUrl: scanNotifyUrlStub,
                priority,
            };
            const requestBody = {
                url: scanUrl,
                scanNotifyUrl: scanNotifyUrlStub,
                reportGroups: [{ consolidatedId: reportId }],
                priority,
            };
            const requestOptions = { json: createPostScanRequestObj(requestBody) };

            setupVerifiableSignRequestCall();
            postMock
                .setup((req) => req(`${baseUrl}/scans`, requestOptions))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.postScanUrl(scanUrl, scanOptions);

            expect(actualResponse).toEqual(response);
        });

        it('with deepScan=true and deepScanOptions set', async () => {
            const reportId = 'some-report-id';
            const knownPage = 'some-known-url';
            const scanOptions: PostScanRequestOptions = {
                priority,
                deepScan: true,
                consolidatedId: reportId,
                deepScanOptions: {
                    baseUrl: scanUrl,
                    knownPages: [knownPage],
                },
            };
            const requestBody = {
                url: scanUrl,
                deepScan: true,
                site: {
                    baseUrl: scanUrl,
                    knownPages: [knownPage],
                },
                reportGroups: [{ consolidatedId: reportId }],
                priority,
            };
            const requestOptions = { json: createPostScanRequestObj(requestBody) };
            setupVerifiableSignRequestCall();
            postMock
                .setup((req) => req(`${baseUrl}/scans`, requestOptions))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.postScanUrl(scanUrl, scanOptions);

            expect(actualResponse).toEqual(response);
        });

        it('with privacyScan=true', async () => {
            const scanOptions: PostScanRequestOptions = {
                privacyScan: true,
                priority,
            };
            const requestBody: ScanRunRequest = {
                url: scanUrl,
                priority,
                privacyScan: {
                    cookieBannerType: 'standard',
                },
            };
            const requestOptions = { json: createPostScanRequestObj(requestBody) };

            setupVerifiableSignRequestCall();
            postMock
                .setup((req) => req(`${baseUrl}/scans`, requestOptions))
                .returns(async () => Promise.resolve(response))
                .verifiable(Times.once());

            const actualResponse = await testSubject.postScanUrl(scanUrl, scanOptions);

            expect(actualResponse).toEqual(response);
        });

        function createPostScanRequestObj(scanRunRequest: ScanRunRequest): ScanRunRequest[] {
            // fills in undefined fields
            return [
                {
                    url: undefined,
                    priority: undefined,
                    scanNotifyUrl: undefined,
                    deepScan: undefined,
                    authenticationType: undefined,
                    ...scanRunRequest,
                },
            ];
        }
    });

    it('getScanStatus', async () => {
        const scanId = 'scanId';
        setupVerifiableSignRequestCall();
        getMock
            .setup((req) => req(`${baseUrl}/scans/${scanId}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanStatus(scanId);

        expect(actualResponse).toEqual(response);
    });

    it('getScanReport', async () => {
        const scanId = 'scanId';
        const reportId = 'reportId';
        const options: Options = { responseType: 'buffer' };
        setupVerifiableSignRequestCall();
        getMock
            .setup((req) => req(`${baseUrl}/scans/${scanId}/reports/${reportId}`, options))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        const actualResponse = await testSubject.getScanReport(scanId, reportId);

        expect(actualResponse).toEqual(response);
    });

    it('checkHealth', async () => {
        const suffix = '/abc';
        setupVerifiableSignRequestCall();
        getMock
            .setup((req) => req(`${baseUrl}/health${suffix}`))
            .returns(async () => Promise.resolve(response))
            .verifiable(Times.once());

        await testSubject.checkHealth(suffix);
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
            .setup((req) => req(`${baseUrl}/health`))
            .returns(async () => Promise.reject(errRes))
            .verifiable(Times.atLeast(5));

        let errResponse;

        await testSubject.checkHealth().catch((err) => {
            errResponse = err;
        });

        expect(errResponse).toEqual(errRes);
    });
});

function setupVerifiableSignRequestCall(): void {
    credMock
        .setup((o) => o.signRequest(gotStub))
        .returns(async () => Promise.resolve(gotStub))
        .verifiable(Times.atLeast(1));
}

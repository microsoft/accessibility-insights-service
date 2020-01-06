// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import 'reflect-metadata';

import { ResponseWithBodyType } from 'azure-services';
import { GuidGenerator } from 'common';
import * as request from 'request-promise';
import { ScanReport, ScanRunErrorResponse, ScanRunResultResponse, WebApiErrorCode, WebApiErrorCodes } from 'service-library';
import { A11yServiceClient, A11yServiceCredential } from 'web-api-client';

describe('Web Api E2E Tests', () => {
    const timeout = 900000; // 15 minutes
    let scanUrl: string;
    let baseUrl: string;
    let apiVersion: string;

    let clientId: string;
    let clientSecret: string;
    let authorityUrl: string;

    const invalidGuid = '00000000-0000-0000-0000-000000000000';

    let webApiCredential: A11yServiceCredential;
    let webApiClient: A11yServiceClient;

    let guidGenerator: GuidGenerator;

    beforeEach(() => {
        scanUrl = process.env.scanUrl;
        baseUrl = process.env.baseUrl;
        apiVersion = process.env.apiVersion;

        clientId = process.env.clientId;
        clientSecret = process.env.clientSecret;
        authorityUrl = process.env.authorityUrl;

        validateInputs();

        webApiCredential = new A11yServiceCredential(clientId, clientSecret, clientId, authorityUrl);
        webApiClient = new A11yServiceClient(webApiCredential, baseUrl, apiVersion);
        guidGenerator = new GuidGenerator();
    });

    it(
        'Scan submission happy path',
        async () => {
            const scanId = await getScanId();

            expect(scanId).toBeDefined();

            const scanStatus = await getScanStatus(scanId);
            expect(scanStatus.run.state).toBe('pending');

            const scanRunResult = await waitForScanCompletion(scanId);

            await validateGetReports(scanRunResult);
        },
        timeout,
    );

    it(
        'Missing api version',
        async () => {
            webApiClient = new A11yServiceClient(webApiCredential, baseUrl, '');
            const submitScanResponse = await webApiClient.postScanUrl(scanUrl);
            validateWebApiError(submitScanResponse, WebApiErrorCodes.missingApiVersionQueryParameter);
        },
        timeout,
    );

    it(
        'Invalid api version',
        async () => {
            webApiClient = new A11yServiceClient(webApiCredential, baseUrl, 'invalidApiVersion');
            const submitScanResponse = await webApiClient.postScanUrl(scanUrl);
            validateWebApiError(submitScanResponse, WebApiErrorCodes.unsupportedApiVersion);
        },
        timeout,
    );

    it(
        'Invalid scan url',
        async () => {
            const submitScanResponse = await webApiClient.postScanUrl('invalidUrl');
            const expectedError = [{ error: WebApiErrorCodes.invalidURL.error, url: 'invalidUrl' }];
            expect(submitScanResponse.statusCode).toBe(202);
            expect(submitScanResponse.body).toEqual(expectedError);
        },
        timeout,
    );

    it(
        'out of range priority',
        async () => {
            const submitScanResponse = await webApiClient.postScanUrl(scanUrl, 999999999999999);
            const expectedError = [{ error: WebApiErrorCodes.outOfRangePriority.error, url: scanUrl }];
            expect(submitScanResponse.statusCode).toBe(202);
            expect(submitScanResponse.body).toEqual(expectedError);
        },
        timeout,
    );

    it(
        'get status of invalid scan id',
        async () => {
            const scanStatusResponse = await webApiClient.getScanStatus(invalidGuid);
            validateWebApiError(scanStatusResponse, WebApiErrorCodes.invalidResourceId);
        },
        timeout,
    );

    it(
        'invalidReportId',
        async () => {
            const getReportResponse = await webApiClient.getScanReport(invalidGuid, invalidGuid);
            validateWebApiError(getReportResponse, WebApiErrorCodes.invalidResourceId);
        },
        timeout,
    );

    it('NonexistantReportId', async () => {
        const nonexistantReportId = guidGenerator.createGuid();
        const getReportResponse = await webApiClient.getScanReport(invalidGuid, nonexistantReportId);
        validateWebApiError(getReportResponse, WebApiErrorCodes.resourceNotFound);
    });

    function validateInputs(): void {
        expect(scanUrl).toBeDefined();
        expect(baseUrl).toBeDefined();
        expect(apiVersion).toBeDefined();
        expect(clientId).toBeDefined();
        expect(clientSecret).toBeDefined();
        expect(authorityUrl).toBeDefined();
    }

    async function getScanId(): Promise<string> {
        const scanSubmissionResponse = await webApiClient.postScanUrl(scanUrl);
        expect(scanSubmissionResponse.statusCode).toBe(202);
        const scanSubmissionBody = scanSubmissionResponse.body[0];
        expect(scanSubmissionBody.error).toBeUndefined();
        expect(scanSubmissionBody.scanId).toBeDefined();

        return scanSubmissionBody.scanId;
    }

    async function getScanStatus(scanId: string): Promise<ScanRunResultResponse> {
        const response = await webApiClient.getScanStatus(scanId);
        expect(response.statusCode).toBe(200);

        const scanErrorResultResponse = response.body as ScanRunErrorResponse;
        expect(scanErrorResultResponse.error).toBeUndefined();

        const scanRunResultResponse = response.body as ScanRunResultResponse;
        expect(scanRunResultResponse.run.error).toBeUndefined();

        return scanRunResultResponse;
    }

    async function waitForScanCompletion(scanId: string): Promise<ScanRunResultResponse> {
        let scanStatus = 'pending';
        let response: ScanRunResultResponse;
        while (scanStatus !== 'completed' && scanStatus !== 'failed') {
            console.log('Waiting for scan completion...');
            await wait(5000);
            response = await getScanStatus(scanId);
            scanStatus = response.run.state;
        }
        expect(scanStatus).toBe('completed');

        return response;
    }

    async function wait(milliseconds: number): Promise<unknown> {
        // tslint:disable-next-line: no-string-based-set-timeout
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    async function validateGetReports(scanRunResult: ScanRunResultResponse): Promise<void> {
        const scanId = scanRunResult.scanId;
        const reportIds = scanRunResult.reports.map((scanReport: ScanReport) => scanReport.reportId);
        reportIds.forEach(async (reportId: string) => {
            const getReportResponse = await webApiClient.getScanReport(scanId, reportId);
            expect(getReportResponse.statusCode).toBe(200);
        });
    }

    function validateWebApiError(response: ResponseWithBodyType<unknown>, expectedError: WebApiErrorCode, expectedStatusCode?: number) {
        const statusCode = expectedStatusCode === undefined ? expectedError.statusCode : expectedStatusCode;
        expect(response.statusCode).toBe(statusCode);
        expect(response.body).toEqual({ error: expectedError.error });
    }
});

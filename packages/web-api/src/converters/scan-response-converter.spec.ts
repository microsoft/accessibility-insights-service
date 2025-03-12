// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import {
    DeepScanResultItem,
    RunState as RunStateRestApi,
    ScanCompletedNotification,
    ScanNotificationErrorCodes,
    ScanResultResponse,
    ScanRunErrorCodes,
    ScanRunResultResponse,
    RunState,
    RunStateClientProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanResult,
    OnDemandPageScanRunState as RunStateDb,
    ScanCompletedNotification as NotificationDb,
    WebsiteScanResult,
    OnDemandPageScanRunState,
    NotificationError,
    ScanType,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanErrorConverter } from './scan-error-converter';
import { ScanResponseConverter } from './scan-response-converter';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface options {
    dbState?: RunStateDb;
    restApiState?: RunStateRestApi;
    isNotificationEnabled?: boolean;
    isDeepScanEnabled?: boolean;
    isAuthenticationEnabled?: boolean;
    isPrivacyScan?: boolean;
    isError?: boolean;
    scanType?: ScanType;
}

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
const scanRunError = 'internal-error';
const pageTitle = 'sample page title';
const pageResponseCode = 101;

let scanResponseConverter: ScanResponseConverter;
let scanErrorConverterMock: IMock<ScanErrorConverter>;
let runStateClientProviderMock: IMock<RunStateClientProvider>;
let notificationDb: NotificationDb;
let notificationResponse: ScanCompletedNotification;
let deepScanResult: DeepScanResultItem[];
let websiteScanResult: WebsiteScanResult;

beforeEach(() => {
    scanErrorConverterMock = Mock.ofType(ScanErrorConverter);
    runStateClientProviderMock = Mock.ofType<RunStateClientProvider>();
    scanErrorConverterMock
        .setup((o) => o.getScanRunErrorCode(scanRunError))
        .returns(() => ScanRunErrorCodes.internalError)
        .verifiable(Times.once());
    scanErrorConverterMock
        .setup((o) => o.getScanNotificationErrorCode({ errorType: 'InternalError' } as NotificationError))
        .returns(() => ScanNotificationErrorCodes.InternalError)
        .verifiable();

    let state: OnDemandPageScanRunState;
    runStateClientProviderMock
        .setup((o) => o.getEffectiveRunState(It.isAny()))
        .callback((r) => (state = r.run.state))
        .returns(() => Promise.resolve(state))
        .verifiable();

    scanResponseConverter = new ScanResponseConverter(scanErrorConverterMock.object, runStateClientProviderMock.object);
    notificationResponse = {
        scanNotifyUrl: 'reply-url',
        state: 'queued',
        responseCode: 200,
    };
    notificationDb = {
        scanNotifyUrl: 'reply-url',
        state: 'queued',
        responseCode: 200,
    };
    deepScanResult = getDeepScanResult();
    websiteScanResult = getWebsiteScanResult();
});

describe(ScanResponseConverter, () => {
    test.each([true, false])('return not completed result, when notification enabled = %s', async (isNotificationEnabled) => {
        await validateConverterShortResult({ dbState: 'pending', restApiState: 'pending', isNotificationEnabled });
        await validateConverterShortResult({ dbState: 'accepted', restApiState: 'accepted', isNotificationEnabled });
        await validateConverterShortResult({ dbState: 'queued', restApiState: 'queued', isNotificationEnabled });
        await validateConverterShortResult({ dbState: 'running', restApiState: 'running', isNotificationEnabled });
        await validateConverterShortResult({ dbState: 'report', restApiState: 'report', isNotificationEnabled });
        await validateConverterShortResult({ dbState: 'failed', restApiState: 'failed', isNotificationEnabled, isError: true });
    });

    test.each([true, false])('return completed scan run result, when notification enabled = %s', async (isNotificationEnabled) => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isNotificationEnabled });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', isNotificationEnabled });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result with error', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isError: true });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', isError: true });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result, when deepScan is disabled', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed' });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed' });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result with authentication result', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isAuthenticationEnabled: true });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', isAuthenticationEnabled: true });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed privacy scan result', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', scanType: 'privacy' });
        const responseExpected = getScanResultClientResponseFull({ restApiState: 'completed', scanType: 'privacy' });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    test.each(['pending', 'completed', 'failed'])(
        'return completed result, when deepScan is enabled and overall deep scan state = %s',
        async (deepScanOverallState: RunState) => {
            deepScanResult = getDeepScanResult(deepScanOverallState);
            const pageScanDbResult = getPageScanResult({ dbState: 'completed', isDeepScanEnabled: true });
            const responseExpected = getScanResultClientResponseFull({ restApiState: deepScanOverallState, isDeepScanEnabled: true });
            const response = await scanResponseConverter.getScanResultResponse(
                baseUrl,
                apiVersion,
                pageScanDbResult,
                getWebsiteScanResult(deepScanOverallState),
            );
            expect(response).toEqual(responseExpected);
        },
    );

    it('adds error to notification if db has error info', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isNotificationEnabled: true });
        notificationDb.error = { errorType: 'InternalError' } as NotificationError;
        notificationResponse.error = ScanNotificationErrorCodes.InternalError;
        const responseExpected: ScanRunResultResponse = getScanResultClientResponseFull({
            restApiState: 'completed',
            isNotificationEnabled: true,
        }) as ScanRunResultResponse;
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('does not add error to notification if db document has no error', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed', isNotificationEnabled: true });
        const responseExpected: ScanRunResultResponse = getScanResultClientResponseFull({
            restApiState: 'completed',
            isNotificationEnabled: true,
        }) as ScanRunResultResponse;
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('create full canonical REST Get Report URL', async () => {
        const pageScanDbResult = getPageScanResult({ dbState: 'completed' });
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect((<any>response).reports[0].links.href).toEqual('https://localhost/api/scans/id/reports/reportIdSarif?api-version=1.0');
    });
});

function getDeepScanResult(deepScanOverallState: RunState = 'pending'): DeepScanResultItem[] {
    const result = [
        {
            scanId: 'scanId1',
            url: 'url1',
            scanRunState: 'pending',
        },
        {
            scanId: 'scanId2',
            url: 'url2',
            scanRunState: 'failed',
        },
        {
            scanId: 'scanId3',
            url: 'url3',
            scanRunState: 'completed',
            scanResultState: 'pass',
        },
    ] as DeepScanResultItem[];
    if (deepScanOverallState === 'failed') {
        result.map((scan) => (scan.scanRunState = 'failed'));
    } else if (deepScanOverallState === 'completed') {
        result.map((scan) => (scan.scanRunState = 'completed'));
        result[0].scanRunState = 'failed';
    }

    return result;
}

function getWebsiteScanResult(deepScanOverallState: RunState = 'pending'): WebsiteScanResult {
    const result = {
        deepScanId: 'id',
        pageScans: [
            {
                scanId: 'scanId1',
                url: 'url1',
            },
            {
                scanId: 'scanId2',
                url: 'url2',
                runState: 'failed',
            },
            {
                scanId: 'scanId3',
                url: 'url3',
                runState: 'completed',
                scanState: 'pass',
            },
        ],
    } as WebsiteScanResult;
    if (deepScanOverallState === 'failed') {
        result.pageScans.map((scan) => (scan.runState = 'failed'));
    } else if (deepScanOverallState === 'completed') {
        result.pageScans.map((scan) => (scan.runState = 'completed'));
        result.pageScans[0].runState = 'failed';
    }

    return result;
}

function getPageScanResult(options: options): OnDemandPageScanResult {
    if (!options.isDeepScanEnabled === true) {
        websiteScanResult = undefined;
    }

    return {
        id: 'id',
        deepScanId: options.isDeepScanEnabled ? 'id' : undefined,
        itemType: ItemType.onDemandPageScanRunResult,
        partitionKey: 'partitionKey',
        url: 'url',
        priority: 10,
        scanType: options.scanType ?? 'accessibility',
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
        browserValidationResult: { highContrastProperties: 'pass' },
        reports: [
            {
                reportId: 'reportIdSarif',
                format: 'sarif',
                href: 'href',
            },
            {
                reportId: 'reportIdHtml',
                format: 'html',
                href: 'href',
            },
        ],
        run: {
            state: options.dbState,
            pageTitle: pageTitle,
            pageResponseCode: pageResponseCode,
            error: options.isError === true ? 'internal-error' : undefined,
            scanRunDetails: [{ name: 'accessibility_agent', state: 'completed' }],
        },
        batchRequestId: 'batch-id',
        ...(options.isNotificationEnabled === true ? { notification: notificationDb } : {}),
        ...(options.isAuthenticationEnabled === true
            ? {
                  authentication: {
                      hint: 'entraId',
                      detected: 'entraId',
                      state: 'succeeded',
                  },
              }
            : {}),
    };
}

function getScanResultClientResponseFull(options: options): ScanResultResponse {
    if (!options.isDeepScanEnabled === true) {
        websiteScanResult = undefined;
    }

    return {
        scanId: 'id',
        deepScanId: options.isDeepScanEnabled ? 'id' : undefined,
        url: 'url',
        scanType: options.scanType ?? 'accessibility',
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
        browserValidationResult: {
            highContrastProperties: 'pass',
        },
        reports: [
            {
                reportId: 'reportIdSarif',
                format: 'sarif',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportIdSarif?api-version=1.0',
                },
            },
            {
                reportId: 'reportIdHtml',
                format: 'html',
                links: {
                    rel: 'self',
                    href: 'https://localhost/api/scans/id/reports/reportIdHtml?api-version=1.0',
                },
            },
        ],
        run: {
            state: options.restApiState,
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
            error: options.isError === true ? ScanRunErrorCodes.internalError : undefined,
            scanRunDetails: [{ name: 'accessibility_agent', state: 'completed' }],
        },
        ...(options.isNotificationEnabled === true ? { notification: notificationResponse } : {}),
        ...(options.isDeepScanEnabled === true ? { deepScanResult: deepScanResult } : {}),
        ...(options.isAuthenticationEnabled === true
            ? {
                  authentication: {
                      detected: 'entraId',
                      state: 'succeeded',
                  },
              }
            : {}),
    };
}

function getScanResultClientResponseShort(options: options): ScanResultResponse {
    const response: ScanRunResultResponse = {
        scanId: 'id',
        url: 'url',
        scanType: 'accessibility',
        run: {
            state: options.restApiState,
            error: options.isError === true ? ScanRunErrorCodes.internalError : undefined,
        },
        ...(options.isNotificationEnabled === true ? { notification: notificationResponse } : {}),
    };
    if (options.restApiState === 'completed' || options.restApiState === 'failed' || options.restApiState === 'retrying') {
        response.run.pageResponseCode = pageResponseCode;
        response.run.pageTitle = pageTitle;
        response.run.scanRunDetails = [{ name: 'accessibility_agent', state: 'completed' }];
    }

    return response;
}

async function validateConverterShortResult(options: options): Promise<void> {
    const pageScanDbResult = getPageScanResult(options);
    const responseExpected = getScanResultClientResponseShort(options);
    const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
    expect(response).toEqual(responseExpected);
}

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
    ScanCompletedNotification as Notification,
    WebsiteScanResult,
    OnDemandPageScanRunState,
} from 'storage-documents';
import { IMock, It, Mock, Times } from 'typemoq';
import { ScanErrorConverter } from './scan-error-converter';
import { ScanResponseConverter } from './scan-response-converter';

/* eslint-disable @typescript-eslint/no-explicit-any */

const apiVersion = '1.0';
const baseUrl = 'https://localhost/api/';
const scanRunError = 'internal-error';
const pageTitle = 'sample page title';
const pageResponseCode = 101;

let scanResponseConverter: ScanResponseConverter;
let scanErrorConverterMock: IMock<ScanErrorConverter>;
let runStateClientProviderMock: IMock<RunStateClientProvider>;
let notificationDb: Notification;
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
        .setup((o) => o.getScanNotificationErrorCode(It.isAny()))
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
        error: ScanNotificationErrorCodes.InternalError,
        responseCode: 200,
    };
    notificationDb = {
        scanNotifyUrl: 'reply-url',
        state: 'queued',
        error: {
            errorType: 'InternalError',
            message: 'Failed to send notification.',
        },
        responseCode: 200,
    };
    deepScanResult = getDeepScanResult();
    websiteScanResult = getWebsiteScanResult();
});

describe(ScanResponseConverter, () => {
    test.each([true, false])('return not completed result, when notification enabled = %s', async (notificationEnabled) => {
        await validateConverterShortResult('pending', 'pending', notificationEnabled);
        await validateConverterShortResult('accepted', 'accepted', notificationEnabled);
        await validateConverterShortResult('queued', 'queued', notificationEnabled);
        await validateConverterShortResult('running', 'running', notificationEnabled);
        await validateConverterShortResult('report', 'report', notificationEnabled);
        await validateConverterShortResult('failed', 'failed', notificationEnabled);
    });

    test.each([true, false])('return completed scan run result, when notification enabled = %s', async (notificationEnabled) => {
        const pageScanDbResult = getPageScanResult('completed', notificationEnabled);
        const responseExpected = getScanResultClientResponseFull('completed', notificationEnabled);
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result, when deepScan is disabled', async () => {
        const pageScanDbResult = getPageScanResult('completed');
        const responseExpected = getScanResultClientResponseFull('completed');
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed scan result with authentication result', async () => {
        const pageScanDbResult = getPageScanResult('completed', false, false, true);
        const responseExpected = getScanResultClientResponseFull('completed', false, false, false, true);
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('return completed privacy scan result', async () => {
        const pageScanDbResult = getPageScanResult('completed');
        const responseExpected = getScanResultClientResponseFull('completed');
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    test.each(['pending', 'completed', 'failed'])(
        'return completed result, when deepScan is enabled and overall deep scan state = %s',
        async (deepScanOverallState: RunState) => {
            deepScanResult = getDeepScanResult(deepScanOverallState);
            const pageScanDbResult = getPageScanResult('completed', false, true);
            const responseExpected = getScanResultClientResponseFull(deepScanOverallState, false, true);
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
        const pageScanDbResult = getPageScanResult('completed', true);
        const responseExpected: ScanRunResultResponse = getScanResultClientResponseFull('completed', true) as ScanRunResultResponse;
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('does not add error to notification if db doc has no error', async () => {
        const pageScanDbResult = getPageScanResult('completed', true);
        const responseExpected: ScanRunResultResponse = getScanResultClientResponseFull('completed', true) as ScanRunResultResponse;
        pageScanDbResult.notification.error = null;
        const expectedNotificationResponse = responseExpected.notification;
        delete expectedNotificationResponse.error;
        const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
        expect(response).toEqual(responseExpected);
    });

    it('create full canonical REST Get Report URL', async () => {
        const pageScanDbResult = getPageScanResult('completed');
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

function getPageScanResult(
    state: RunStateDb,
    isNotificationEnabled = false,
    isDeepScanEnabled = false,
    isAuthenticationEnabled = false,
): OnDemandPageScanResult {
    if (!isDeepScanEnabled) {
        websiteScanResult = undefined;
    }

    return {
        id: 'id',
        itemType: ItemType.onDemandPageScanRunResult,
        partitionKey: 'partitionKey',
        url: 'url',
        priority: 10,
        scanResult: {
            state: 'fail',
            issueCount: 1,
        },
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
            state: state,
            error: 'internal-error',
            pageTitle: pageTitle,
            pageResponseCode: pageResponseCode,
        },
        batchRequestId: 'batch-id',
        ...(isNotificationEnabled ? { notification: notificationDb } : {}),
        ...(isAuthenticationEnabled
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

function getScanResultClientResponseFull(
    state: RunStateRestApi,
    isNotificationEnabled = false,
    isDeepScanEnabled = false,
    isPrivacyScan = false,
    isAuthenticationEnabled = false,
): ScanResultResponse {
    if (!isDeepScanEnabled) {
        websiteScanResult = undefined;
    }

    return {
        scanId: 'id',
        url: 'url',
        scanType: isPrivacyScan ? 'privacy' : 'accessibility',
        scanResult: {
            state: 'fail',
            issueCount: 1,
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
            state: state,
            pageResponseCode: pageResponseCode,
            pageTitle: pageTitle,
        },
        ...(isNotificationEnabled ? { notification: notificationResponse } : {}),
        ...(isDeepScanEnabled ? { deepScanResult: deepScanResult } : {}),
        ...(isAuthenticationEnabled
            ? {
                  authentication: {
                      detected: 'entraId',
                      state: 'succeeded',
                  },
              }
            : {}),
    };
}

function getScanResultClientResponseShort(state: RunStateRestApi, isNotificationEnabled = false): ScanResultResponse {
    const response: ScanRunResultResponse = {
        scanId: 'id',
        url: 'url',
        scanType: 'accessibility',
        run: {
            state: state,
            error: state === 'failed' || state === 'retrying' ? ScanRunErrorCodes.internalError : undefined,
        },
        ...(isNotificationEnabled ? { notification: notificationResponse } : {}),
    };

    if (state === 'completed' || state === 'failed' || state === 'retrying') {
        response.run.pageResponseCode = pageResponseCode;
        response.run.pageTitle = pageTitle;
    }

    return response;
}

async function validateConverterShortResult(
    dbState: RunStateDb,
    clientState: RunStateRestApi,
    isNotificationEnabled = false,
): Promise<void> {
    const pageScanDbResult = getPageScanResult(dbState, isNotificationEnabled);
    const responseExpected = getScanResultClientResponseShort(clientState, isNotificationEnabled);
    const response = await scanResponseConverter.getScanResultResponse(baseUrl, apiVersion, pageScanDbResult, websiteScanResult);
    expect(response).toEqual(responseExpected);
}
